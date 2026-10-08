<template>
  <div>
    <HeroStage />

    <!-- Each block owns its own top spacing so sections can be reordered
         without the rhythm collapsing. -->
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
      <ProjectIndex />
    </div>

    <div class="pt-section">
      <WorkGrid />
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
