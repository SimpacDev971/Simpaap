export default function Footer() {
    return(
        <footer className="mt-12 text-center py-6 text-sm text-muted-foreground bg-background/50 dark:bg-background/80">
    Made with{" "}
    <span className="text-red-500 font-bold" aria-label="love">
        ♥
    </span>{" "}
    by{" "}
    <a
        href="https://www.simpac.fr/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary hover:underline transition-colors duration-200"
    >
        Simpac
    </a>
    </footer>
    )
}