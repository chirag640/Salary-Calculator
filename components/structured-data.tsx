"use client"

import Script from 'next/script'
import { jsonLdSchemas } from '@/lib/seo-config'

export function StructuredData() {
  return (
    <>
      {/* WebApplication Schema */}
      <Script
        id="schema-web-application"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSchemas.webApplication),
        }}
      />

      {/* Organization Schema */}
      <Script
        id="schema-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSchemas.organization),
        }}
      />

      {/* Breadcrumb Schema */}
      <Script
        id="schema-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSchemas.breadcrumb),
        }}
      />

      {/* Software Application Schema */}
      <Script
        id="schema-software-application"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSchemas.softwareApplication),
        }}
      />
    </>
  )
}
