'use client'

import { ExternalLink, MapPinned, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const qgisRepoUrl = 'https://github.com/Taz33m/qgis-ai-geospatial-assets'

export default function DataMethodologyPanel() {
  return (
    <Card className="mt-4 border-red-100 bg-white/90 shadow-sm">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2 text-red-900">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <CardTitle className="text-base">Campus Data QA</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <p className="text-sm leading-6 text-gray-700">
          RPInSight treats campus locations as reviewed geospatial assets:
          searchable points, source-aware notes, and confidence cues for
          answers that need approximation.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-red-100 bg-red-50/70 p-2">
            <div className="font-semibold text-red-950">22</div>
            <div className="text-gray-600">campus points</div>
          </div>
          <div className="rounded-md border border-red-100 bg-red-50/70 p-2">
            <div className="font-semibold text-red-950">4</div>
            <div className="text-gray-600">curated layers</div>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full border-red-200 text-red-900 hover:bg-red-50"
        >
          <a href={qgisRepoUrl} target="_blank" rel="noopener noreferrer">
            <MapPinned className="mr-2 h-4 w-4" aria-hidden="true" />
            QGIS QA portfolio
            <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
