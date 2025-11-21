import { Button } from '@/components/ui/button';
import { getUserAccess, UserAccess } from '@/lib/auth/getUserAccess';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function SubdomainPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params
  
  const access: UserAccess = await getUserAccess(subdomain);
  const { isLogged, isAdmin, isSameTenant } = access;
  console.log(access);
  
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
    })

    if (!tenant) {
      notFound()
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background text-foreground transition-colors duration-300">
        <div className="max-w-4xl w-full px-4 text-center">
          <h1 className="text-5xl font-bold text-primary mb-4">
            Bienvenue sur {tenant.name}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Espace dédié à {subdomain}
          </p>
          <div className="flex gap-4 justify-center">
            {!isLogged && (
              <Link href="/login" passHref>
                <Button variant="default" size="lg">
                  Se connecter
                </Button>
              </Link>
            )}
            {isLogged && isAdmin && isSameTenant && (
              <Link href="/admin" passHref>
                <Button variant="secondary" size="lg">
                  Administration
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('SubdomainPage: Error fetching tenant:', error)
    notFound()
  }
}
