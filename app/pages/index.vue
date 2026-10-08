<template>
  <div>
    <HeroStage />

    <!-- Each block owns its own top spacing so sections can be reordered
         without the rhythm collapsing. -->
    <!-- The work comes straight after the hero: the page is a gallery first,
         and everything about the person hanging it follows. -->
    <div class="pt-section">
      <WorkGallery />
    </div>

    <div class="pt-section">
      <StatementBlock
        eyebrow="Approach"
        lead="I reject the superfluous. Building systems and interfaces"
        tail="grounded in clarity, purpose, and maintainable craft."
      />
    </div>

    <div class="pt-section">
      <AboutBlock />
    </div>

    <div class="pt-section">
      <ToolsSection />
    </div>

    <div class="pt-section">
      <StatementBlock
        lead="Good software is built on good questions. The problem sets the direction,"
        tail="the data model gives it shape, and everything after that is upkeep."
      />
    </div>

    <div class="pt-section">
      <ServicesStrip />
    </div>

    <div class="pt-section">
      <PricingStrip />
    </div>

    <div class="pt-section">
      <ContactOutro />
    </div>
  </div>
</template>
