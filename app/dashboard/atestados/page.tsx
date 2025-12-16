'use client'

import { MedicalCertificateForm } from '@/components/documents/medical-certificate-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function AtestadosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Atestados Médicos</h1>
        <p className="text-muted-foreground">
          Gere atestados médicos em PDF para seus pacientes
        </p>
      </div>

      <MedicalCertificateForm />
    </div>
  )
}

