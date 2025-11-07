import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function SubdomainPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params
  
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
    })

    if (!tenant) {
      notFound()
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl w-full px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Bienvenue sur {tenant.name}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Espace dédié à {subdomain}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={`/${subdomain}/login`}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Se connecter
            </Link>
            <Link
              href={`/${subdomain}/admin`}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Administration
            </Link>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('SubdomainPage: Error fetching tenant:', error)
    notFound()
  }
}
