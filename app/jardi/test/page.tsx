"use client";

import ProtectedComponent from "@/components/auth/ProtectedComponent";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Mail,
  Send,
  Shield,
  TrendingUp,
  Upload,
  Users,
  Zap
} from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Plateforme d'éditique nouvelle génération
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Simplifiez l'envoi de vos courriers
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Soumettez vos PDF, personnalisez vos envois et suivez vos campagnes en temps réel. 
              Une solution complète pour votre communication par courrier.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link href="/login">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Voir la démo
              </Button>
            </div>
            
            {/* Hero Visual */}
            <div className="pt-16 relative">
              <div className="relative mx-auto max-w-5xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent blur-3xl rounded-full" />
                <div className="relative bg-card border rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Document PDF</span>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                      <Upload className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Upload</span>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                      <Send className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Envoi</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {
      <ProtectedComponent
        permission={{
          allowedRoles: [],
          requireAuth: true,
        }}
        loadingComponent={<div>Chargement...</div>}
        fallbackComponent={<></>}/* permet de ne pas affiché accès refusé */
      >
        <FeatureSection />
      </ProtectedComponent>
  }

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Stats Section */}
      <StatsSection />

      {/* CTA Section */}
      <CTASection />

      {/* Partners Carousel Section */}
      <PartnersCarousel />
    </div>
  );
}

const features = [
  {
    icon: <Upload className="w-6 h-6 text-primary" />,
    title: "Upload simple",
    description: "Téléversez vos PDF en quelques clics. Support de tous les formats standards."
  },
  {
    icon: <FileCheck className="w-6 h-6 text-primary" />,
    title: "Validation automatique",
    description: "Vérification automatique de la qualité et de la conformité de vos documents."
  },
  {
    icon: <Mail className="w-6 h-6 text-primary" />,
    title: "Personnalisation",
    description: "Personnalisez vos envois avec des modèles et des données dynamiques."
  },
  {
    icon: <Send className="w-6 h-6 text-primary" />,
    title: "Envoi rapide",
    description: "Envoi massif optimisé avec suivi en temps réel de chaque courrier."
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-primary" />,
    title: "Analytics",
    description: "Tableaux de bord détaillés pour suivre vos campagnes et performances."
  },
  {
    icon: <Shield className="w-6 h-6 text-primary" />,
    title: "Sécurité",
    description: "Vos données sont protégées avec un chiffrement de niveau entreprise."
  }
];

const steps = [
  {
    title: "Uploadez vos PDF",
    description: "Importez vos documents PDF directement depuis votre ordinateur ou votre cloud.",
    icon: <Upload className="w-12 h-12 text-primary mx-auto" />
  },
  {
    title: "Personnalisez",
    description: "Ajoutez vos destinataires, personnalisez le contenu et configurez vos paramètres.",
    icon: <FileText className="w-12 h-12 text-primary mx-auto" />
  },
  {
    title: "Envoyez et suivez",
    description: "Lancez votre campagne et suivez en temps réel l'état de vos envois.",
    icon: <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
  }
];

const stats = [
  {
    icon: <Users className="w-8 h-8 text-primary mx-auto" />,
    value: "500+",
    label: "Clients satisfaits"
  },
  {
    icon: <Mail className="w-8 h-8 text-primary mx-auto" />,
    value: "1M+",
    label: "Courriers envoyés"
  },
  {
    icon: <Clock className="w-8 h-8 text-primary mx-auto" />,
    value: "24/7",
    label: "Disponibilité"
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-primary mx-auto" />,
    value: "99.9%",
    label: "Taux de réussite"
  }
];

function FeatureSection() {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section ref={ref} className={cn("py-24 relative transition-all duration-1000", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une plateforme complète pour gérer tous vos envois de courriers
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={cn(
                "group hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-primary/50",
                isVisible && "animate-fade-in-up"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section ref={ref} className={cn("py-24 bg-muted/30 transition-all duration-1000", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Comment ça marche ?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            En trois étapes simples, envoyez vos courriers en toute simplicité
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className={cn("relative transition-all duration-700", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")} style={{ transitionDelay: `${index * 200}ms` }}>
                <div className="text-center space-y-4">
                  <div className="relative inline-flex">
                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                      {index + 1}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-primary to-primary/20 -translate-y-1/2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="flex justify-center pt-4">
                    {step.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section ref={ref} className={cn("py-24 transition-all duration-1000", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className={cn(
                "text-center border-2 hover:border-primary/50 transition-all duration-300 hover:scale-105",
                isVisible && "animate-fade-in-up"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {stat.icon}
                </div>
                <CardTitle className="text-4xl font-bold text-primary">
                  {stat.value}
                </CardTitle>
                <CardDescription className="text-base font-medium">
                  {stat.label}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section ref={ref} className={cn("py-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent transition-all duration-1000", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="max-w-4xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="text-center space-y-4 pb-8">
            <CardTitle className="text-4xl md:text-5xl font-bold">
              Prêt à simplifier vos envois ?
            </CardTitle>
            <CardDescription className="text-xl">
              Rejoignez des centaines d'entreprises qui font confiance à notre plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 justify-center pb-8">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/login">
                Démarrer maintenant
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Contacter un expert
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

const partners = [
  { name: "TechCorp", logo: "TC" },
  { name: "Innovate Solutions", logo: "IS" },
  { name: "Digital Partners", logo: "DP" },
  { name: "Cloud Systems", logo: "CS" },
  { name: "Future Tech", logo: "FT" },
  { name: "Smart Business", logo: "SB" },
  { name: "Enterprise Plus", logo: "EP" },
  { name: "Global Networks", logo: "GN" },
];

function PartnersCarousel() {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      ref={ref} 
      className={cn(
        "py-16 bg-muted/50 border-t transition-all duration-1000",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-bold mb-2">
            Ils nous font confiance
          </h3>
          <p className="text-muted-foreground">
            Des entreprises de toutes tailles nous font confiance pour leurs envois
          </p>
        </div>
        
        <div className="relative overflow-hidden">
          <div className="flex animate-scroll">
            {/* Premier set de logos */}
            {partners.map((partner, index) => (
              <div
                key={`first-${index}`}
                className="flex-shrink-0 mx-8 flex items-center justify-center"
              >
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg bg-card border-2 border-border hover:border-primary/50 transition-colors flex items-center justify-center shadow-sm hover:shadow-md">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                      {partner.logo}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground font-medium">
                      {partner.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Duplication pour l'effet infini */}
            {partners.map((partner, index) => (
              <div
                key={`second-${index}`}
                className="flex-shrink-0 mx-8 flex items-center justify-center"
              >
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg bg-card border-2 border-border hover:border-primary/50 transition-colors flex items-center justify-center shadow-sm hover:shadow-md">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                      {partner.logo}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground font-medium">
                      {partner.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
