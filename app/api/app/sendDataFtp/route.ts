// app/api/app/sendDataFtp/route.ts — dépôt SFTP (SSH)
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { createHash, timingSafeEqual } from 'crypto';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import SftpClient from 'ssh2-sftp-client';

// Empreinte SHA256 de la clé du serveur (format `ssh-keygen -lf` : "SHA256:xxxx")
// Si définie, la connexion est refusée quand la clé présentée ne correspond pas
const FTP_HOST_FINGERPRINT = process.env.FTP_HOST_FINGERPRINT?.replace(/^SHA256:/, '').replace(/=+$/, '');

function verifyHostKey(key: Buffer): boolean {
  if (!FTP_HOST_FINGERPRINT) return true;
  const received = Buffer.from(createHash('sha256').update(key).digest('base64').replace(/=+$/, ''));
  const expected = Buffer.from(FTP_HOST_FINGERPRINT);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Configuration SFTP (à adapter selon votre serveur)
const SFTP_CONFIG: SftpClient.ConnectOptions = {
  host: process.env.FTP_HOST || 'sftp.example.com',
  port: parseInt(process.env.FTP_PORT || '22'),
  username: process.env.FTP_USER || 'username',
  password: process.env.FTP_PASSWORD || 'password',
  readyTimeout: 20000,
  hostVerifier: verifyHostKey,
};

// ==============================
// CONFIGURATIONS
// ==============================
const VERBOSE_FTP = false;            // active/désactive le verbose SFTP
const WRITE_CONTROL_FILE = false;     // active/désactive control.json
const SUB_FOLDER = false;     // active/désactive sous dossier
// ==============================

// Répertoire de destination sur le SFTP
const FTP_BASE_DIR = process.env.FTP_BASE_DIR || '/uploads/mail';

export async function POST(request: NextRequest) {
  // Session obligatoire : un dépôt déclenche une impression facturée
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = new SftpClient();
  if (!FTP_HOST_FINGERPRINT) {
    console.warn('⚠ FTP_HOST_FINGERPRINT non défini : clé du serveur SFTP non vérifiée');
  }

  let printItemId: string | null = null;

  try {
      // Récupération du formData
      const formData = await request.formData();
      const jsonData = formData.get("metadata") as string;

      if (!jsonData) {
          return NextResponse.json({ error: "metadata manquant" }, { status: 400 });
      }

      const metadata = JSON.parse(jsonData);

      // Extraction dynamique des fichiers PDF
      const pdfFiles: { id: string; file: File }[] = [];
      formData.forEach((value, key) => {
          if (value instanceof File) pdfFiles.push({ id: key, file: value });
      });

      if (pdfFiles.length === 0) {
          return NextResponse.json({ error: "Aucun fichier PDF reçu" }, { status: 400 });
      }

      // Create print_item record if user is authenticated
      if (session?.user) {
          const tenantSlug = session.user.tenantSlug;
          if (tenantSlug) {
              const tenant = await prisma.tenant.findUnique({
                  where: { subdomain: tenantSlug },
              });

              if (tenant) {
                  const printItem = await prisma.print_item.create({
                      data: {
                          numTraitement: BigInt(metadata.meta?.numTraitement || Date.now()),
                          tenantId: tenant.id,
                          userId: session.user.id,
                          totalPages: metadata.meta?.totalPages || 0,
                          totalRecipients: metadata.productionOptions?.postage?.totalLetters || 0,
                          totalCost: metadata.productionOptions?.postage?.totalCost || null,
                          rawData: metadata,
                          status: 'pending',
                      },
                  });
                  printItemId = printItem.id;
                  console.log(`✓ print_item created: ${printItemId} (numTraitement: ${metadata.meta?.numTraitement})`);
              }
          }
      }

      // Définition du dépôt FTP avec uniqueKey si présent
      const depositPrefix = metadata.meta?.uniqueKey ? `${metadata.meta.uniqueKey}_` : "";
      // Définir le chemin FTP
      const depositId = SUB_FOLDER
          ? `${depositPrefix}mail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
          : ""; // si false, déposer à la racine
      const depositDir = SUB_FOLDER ? `${FTP_BASE_DIR}/${depositId}` : FTP_BASE_DIR;

      await client.connect({
          ...SFTP_CONFIG,
          debug: VERBOSE_FTP ? (msg: string) => console.log(msg) : undefined,
      });
      if (SUB_FOLDER) await client.mkdir(depositDir, true);

      // Upload de chaque PDF sous son ID du JSON
      for (const item of pdfFiles) {
          const buffer = Buffer.from(await item.file.arrayBuffer());
          const filename = `${item.id}.pdf`;
          await client.put(buffer, `${depositDir}/${filename}`);
          console.log(`✓ Upload: ${filename}`);
      }

      // Upload du JSON metadata
      const metadataFilename = `${depositPrefix}metadata.json`;
      await client.put(
          Buffer.from(JSON.stringify(metadata, null, 2)),
          `${depositDir}/${metadataFilename}`
      );

      // Fichier de contrôle optionnel
      if (WRITE_CONTROL_FILE) {
          const controlData = {
              depositId: SUB_FOLDER ? depositId : null,
              timestamp: {
                  iso: new Date().toISOString(),
                  epoch: Date.now(),
              },
              pdfFiles: pdfFiles.map(f => `${f.id}.pdf`),
              metadata: metadataFilename,
              status: "uploaded",
          };
          await client.put(
              Buffer.from(JSON.stringify(controlData, null, 2)),
              `${depositDir}/${depositPrefix}control.json`
          );
          console.log("✓ control.json créé");
      }

      await client.end();

      // Update print_item status to 'sent' on success
      if (printItemId) {
          await prisma.print_item.update({
              where: { id: printItemId },
              data: {
                  status: 'sent',
                  sendAt: new Date(),
              },
          });
          console.log(`✓ print_item updated to sent: ${printItemId}`);
      }

      return NextResponse.json({
          success: true,
          depositId: SUB_FOLDER ? depositId : null,
          ftpPath: depositDir,
          files: pdfFiles.map(f => `${f.id}.pdf`),
          printItemId,
      });
  } catch (error: unknown) {
      console.error("Erreur SFTP:", error);
      try { await client.end(); } catch {}

      // Update print_item status to 'failed' on error
      if (printItemId) {
          await prisma.print_item.update({
              where: { id: printItemId },
              data: { status: 'failed' },
          });
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Endpoint GET pour vérifier la santé de l'API
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Mail Upload API',
    version: '1.0.0',
  });
}