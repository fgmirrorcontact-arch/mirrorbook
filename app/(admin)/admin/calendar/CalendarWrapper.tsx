'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type CalendarClient from './CalendarClient'

const CalendarClientDynamic = dynamic(() => import('./CalendarClient'), { ssr: false })

export default function CalendarWrapper(props: ComponentProps<typeof CalendarClient>) {
  return <CalendarClientDynamic {...props} />
}
