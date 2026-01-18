import collections
import collections.abc
import sys
import os

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.enum.text import PP_ALIGN
except ImportError:
    print("Error: 'python-pptx' module not found.")
    print("Please install it using: pip install python-pptx")
    sys.exit(1)

def create_presentation():
    prs = Presentation()

    # Define a helper to add a slide with title and bullet points
    def add_slide(title, content_items, layout_index=1):
        slide_layout = prs.slide_layouts[layout_index]
        slide = prs.slides.add_slide(slide_layout)
        
        # Set title
        title_shape = slide.shapes.title
        title_shape.text = title

        # Add content
        if content_items:
            body_shape = slide.placeholders[1]
            tf = body_shape.text_frame
            tf.word_wrap = True
            
            for i, item in enumerate(content_items):
                if i == 0:
                    p = tf.paragraphs[0]
                else:
                    p = tf.add_paragraph()
                
                # Check for nesting (simple string vs tuple/list)
                if isinstance(item, (list, tuple)):
                    p.text = item[0]
                    p.level = 0
                    for sub_item in item[1:]:
                        sub_p = tf.add_paragraph()
                        sub_p.text = sub_item
                        sub_p.level = 1
                else:
                    p.text = item
                    p.level = 0

    # Slide 1: Title Slide
    slide_layout = prs.slide_layouts[0] # Title Slide
    slide = prs.slides.add_slide(slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    title.text = "Eindpresentatie Stage AVE CRM"
    subtitle.text = "Professionalisering van Recruitment Software\n\nStijn van der Neut\n15 Januari 2026"

    # Slide 2: Agenda
    add_slide("Agenda", [
        "Project Context: AVE CRM",
        "Mijn Rol & HBO-i Beroepstaken",
        "Technische Diepgang (Onderzoek & Realisatie)",
        "Persoonlijke Ontwikkeling (Reflectie)",
        "Toekomstvisie (Strategisch Plan)",
        "Vragen"
    ])

    # Slide 3: Project Context: AVE CRM
    add_slide("Project Context: AVE CRM", [
        ("Doel:", "Ontwikkeling van een modern SaaS-platform voor recruitment.", "Vervanging van verouderde legacy processen."),
        ("Tech Stack:", "Frontend: React 19 + TypeScript (Vite, Material-UI)", "Backend: Laravel 12 (PHP 8.3)", "Database: PostgreSQL (Multi-tenant)"),
        ("Infrastructuur:", "Docker, Cloudflare R2 (Storage), Google Cloud (AI)")
    ])

    # Slide 4: HBO-i Beroepstaken Overview
    add_slide("HBO-i Beroepstaken", [
        ("Software Analyseren:", "Requirements analyse, Multi-tenancy strategieën (GDPR)."),
        ("Software Adviseren:", "Architectuur keuzes (TanStack Query, R2 Storage)."),
        ("Software Ontwerpen:", "Database-per-Tenant architectuur, Hybride ID strategie."),
        ("Software Realiseren:", "Full-stack development, AI integraties, Outlook migratie."),
        ("Manage & Control:", "Scrum werkwijze, CI/CD, Code reviews.")
    ])

    # Slide 5: Technisch Hoogstandje 1: Multi-Tenancy
    add_slide("Techniek: Multi-Tenancy Architectuur", [
        ("Probleem:", "Strikte data-isolatie vereist voor GDPR (kandidaten/medische data)."),
        ("Oplossing: Database per Tenant", "Fysiek gescheiden databases per klant.", "Veiligheid 'by design' (geen vergeten WHERE-clauses)."),
        ("Implementatie:", "Spatie Laravel Multitenancy package.", "Custom 'SwitchTenantCacheTask' voor Redis isolatie."),
        ("Security:", "Hybride ID Strategie: Auto-increment intern (snelheid), ULID extern (veiligheid).")
    ])

    # Slide 6: Technisch Hoogstandje 2: AI-Driven Recruitment
    add_slide("Techniek: AI-Driven Recruitment", [
        ("Feature: CV Import & Parsing", "Smart Import: Real-time via Google Gemini 3 Pro.", "Bulk Import: Batch processing via Vertex AI (3500+ CVs)."),
        ("Pipeline:", "Frontend (Chunking) -> Queue -> AI -> R2 Storage."),
        ("Waarde:", "Van handmatige invoer naar secondenwerk.", "Automatische extractie van skills, opleiding en ervaring.")
    ])

    # Slide 7: Architectuur Upgrade: Data Fetching
    add_slide("Professionalisering: Data Fetching", [
        ("Oude Situatie:", "Custom hooks, geen caching, veel boilerplate code."),
        ("Onderzoek (DSR):", "Vergelijking TanStack Query vs SWR vs RTK Query."),
        ("Resultaat: TanStack Query", "50% minder code in hooks.", "Automatische caching, background refetching, optimistic updates.", "Verbeterde User Experience (snellere navigatie).")
    ])

    # Slide 8: Infrastructuur & Deployment
    add_slide("Infrastructuur & Deployment", [
        ("Cloudflare R2:", "Migratie naar Object Storage voor CV's en afbeeldingen.", "Schaalbaar en kosten-efficiënt."),
        ("Microsoft 365 Migratie:", "Professionalisering e-mail en agenda.", "Integratie met CRM (Outlook kalender sync)."),
        ("Deployment Strategie:", "Laravel Forge + DigitalOcean.", "Automated deployments, SSL, Queues, Backups.")
    ])

    # Slide 9: Persoonlijke Ontwikkeling
    add_slide("Persoonlijke Ontwikkeling (Reflectie)", [
        ("Kernontwikkeling:", "Transformatie van 'Afwachtend' naar 'Proactief'."),
        ("Het leerproces:", "Start: 'Ik moet het alleen oplossen' (onzekerheid).", "Inzicht: Hulp vragen is professioneel eigenaarschap."),
        ("Acties:", "Wekelijkse meetings geïnitieerd.", "Zelf de agenda en planning bepalen.")
    ])

    # Slide 10: Omgaan met Tegenslag (Sprint 5)
    add_slide("Veerkracht & Herstel", [
        ("Situatie:", "Terugval door persoonlijke omstandigheden ('Oestergedrag')."),
        ("Leermoment:", "Niet harder werken, maar eerder communiceren.", "Transparantie over 'mindere dagen' bouwt juist vertrouwen."),
        ("Resultaat:", "Regie herpakt, Outlook koppeling succesvol afgerond.", "Bewijs van veerkracht (niveau 2/3).")
    ])

    # Slide 11: Strategische Toekomstvisie
    add_slide("Strategisch Langetermijnplan", [
        ("Fase 1: MVP & Fundering (Nu)", "Technische realisatie & Multi-tenancy architectuur."),
        ("Fase 2: Interne Validatie", "'Eat your own dog food' - optimalisatie door eigen gebruik."),
        ("Fase 3: SaaS Commercialisering", "White-label verkoop aan andere bureaus (1.5 - 2 jaar)."),
        ("Expansie:", "Opzetten interne ICT-recruitment tak gefaciliteerd door het CRM.")
    ])

    # Slide 12: Conclusie
    add_slide("Conclusie", [
        "Product:", "Een modern, veilig en schaalbaar SaaS CRM.",
        "Proces:", "Methodisch gewerkt (DSR, Scrum, Code Reviews).",
        "Persoonlijk:", "Gegroeid van Junior Developer naar Strategisch Partner.",
        "",
        "Zijn er nog vragen?"
    ])

    output_file = "Eindpresentatie_Stage_AVE_CRM.pptx"
    prs.save(output_file)
    print(f"Successfully generated '{output_file}'")

if __name__ == "__main__":
    create_presentation()
