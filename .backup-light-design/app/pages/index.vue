<script setup lang="ts">
import { projects } from '~/data/projects'
</script>

<template>
  <div>
    <Hero />
    <AboutMe />

    <section id="work" class="pb-section">
      <SectionHeading index="02" title="work" :note="`${projects.length} projects`" />

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <ProjectCard
          v-for="(project, i) in projects"
          :key="project.name"
          :project="project"
          :index="String(i + 1).padStart(2, '0')"
        />
      </div>
    </section>

    <Services />
    <ContactCta />
  </div>
</template>
