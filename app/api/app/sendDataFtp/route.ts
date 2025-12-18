// app/api/upload-mail/route.ts
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import * as ftp from 'basic-ftp';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

// Configuration FTP (à adapter selon votre serveur)
const FTP_CONFIG = {
  host: process.env.FTP_HOST || 'ftp.example.com',
  port: parseInt(process.env.FTP_PORT || '21'),
  user: process.env.FTP_USER || 'username',
  password: process.env.FTP_PASSWORD || 'password',
  secure: process.env.FTP_SECURE === 'true', // true pour FTPS
};

// ==============================
// CONFIGURATIONS
// ==============================
const VERBOSE_FTP = false;            // active/désactive le verbose FTP
const WRITE_CONTROL_FILE = false;     // active/désactive control.json
const SUB_FOLDER = false;     // active/désactive sous dossier
// ==============================

// Répertoire de destination sur le FTP
const FTP_BASE_DIR = process.env.FTP_BASE_DIR || '/uploads/mail';

export async function POST(request: NextRequest) {
  const client = new ftp.Client();
  client.ftp.verbose = VERBOSE_FTP;

  // Get session for print_item creation
  const session = await getServerSession(authOptions);
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
                          tenantId: tenant.id,
                          userId: session.user.id,
                          rawData: metadata,
                          status: 'pending',
                      },
                  });
                  printItemId = printItem.id;
                  console.log(`✓ print_item created: ${printItemId}`);
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

      await client.access(FTP_CONFIG);
      if (SUB_FOLDER) await client.ensureDir(depositDir);

      // Upload de chaque PDF sous son ID du JSON
      for (const item of pdfFiles) {
          const buffer = Buffer.from(await item.file.arrayBuffer());
          const stream = Readable.from(buffer);
          const filename = `${item.id}.pdf`;
          await client.uploadFrom(stream, `${depositDir}/${filename}`);
          console.log(`✓ Upload: ${filename}`);
      }

      // Upload du JSON metadata
      const metadataFilename = `${depositPrefix}metadata.json`;
      await client.uploadFrom(
          Readable.from(Buffer.from(JSON.stringify(metadata, null, 2))),
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
          await client.uploadFrom(
              Readable.from(Buffer.from(JSON.stringify(controlData, null, 2))),
              `${depositDir}/${depositPrefix}control.json`
          );
          console.log("✓ control.json créé");
      }

      client.close();

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
      console.error("Erreur FTP:", error);
      try { client.close(); } catch {}

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