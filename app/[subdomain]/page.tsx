import { Button } from '@/components/ui/button';
import { getUserAccess, UserAccess } from '@/lib/auth/getUserAccess';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function SubdomainPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params

  const access: UserAccess = await getUserAccess(subdomain);
  const { isLogged, isAdmin, isSameTenant } = access;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        tenant_application: {
          include: {
            Application: {
              include: {
                categorie: true
              }
            }
          }
        }
      }
    })

    if (!tenant) {
      notFound()
    }

    const applications = tenant.tenant_application.map(ta => ta.Application)
    
    return (
      <div className="flex flex-col items-center min-h-screen py-8 bg-background text-foreground transition-colors duration-300">
        <div className="max-w-7xl w-full px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-primary mb-4">
              Bienvenue
            </h1>
            <div className="flex gap-4 justify-center">
              {!isLogged && (
                <Link href="/login" prefetch={true}>
                  <Button variant="default" size="lg">
                    Se connecter
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {isLogged && applications.length > 0 && (
            <div className="mt-12 flex flex-col items-center">
              <h2 className="text-3xl font-semibold text-center mb-8">
                Vos Applications
              </h2>
              <div className="flex justify-center w-full">
                <div className="flex flex-wrap justify-center gap-6 max-w-5xl w-full">
                  {applications.map((app) => (
                    <Link
                      key={app.id}
                      href={app.url || '#'}
                      className="group w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-sm"
                      prefetch
                    >
                      <div className="h-full p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-300 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {app.nom}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            {app.categorie.nom}
                          </span>
                        </div>
                        {app.description && (
                          <p className="text-muted-foreground text-sm mb-4 flex-grow">
                            {app.description}
                          </p>
                        )}
                        <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-2 transition-transform">
                          Ouvrir l'application
                          <svg
                            className="ml-2 w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('SubdomainPage: Error fetching tenant:', error)
    notFound()
  }
}