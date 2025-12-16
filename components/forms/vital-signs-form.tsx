'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PhysicalExamInput } from '@/lib/validations/physical-exam'

interface VitalSignsFormProps {
  value: PhysicalExamInput['vital_signs']
  onChange: (value: PhysicalExamInput['vital_signs']) => void
}

export function VitalSignsForm({ value, onChange }: VitalSignsFormProps) {
  const [vitalSigns, setVitalSigns] = useState(value || {})

  useEffect(() => {
    onChange(vitalSigns)
  }, [vitalSigns, onChange])

  const updateField = (field: string, val: string) => {
    const numVal = val === '' ? undefined : parseFloat(val)
    setVitalSigns((prev) => ({
      ...prev,
      [field]: numVal,
    }))
  }

  const calculateBMI = () => {
    const weight = vitalSigns?.weight
    const height = vitalSigns?.height
    if (weight && height && height > 0) {
      const heightInMeters = height / 100
      const bmi = weight / (heightInMeters * heightInMeters)
      setVitalSigns((prev) => ({
        ...prev,
        bmi: Math.round(bmi * 10) / 10,
      }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sinais Vitais</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="blood_pressure_systolic">PA Sistólica (mmHg)</Label>
            <Input
              id="blood_pressure_systolic"
              type="number"
              placeholder="120"
              value={vitalSigns?.blood_pressure_systolic || ''}
              onChange={(e) => updateField('blood_pressure_systolic', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blood_pressure_diastolic">PA Diastólica (mmHg)</Label>
            <Input
              id="blood_pressure_diastolic"
              type="number"
              placeholder="80"
              value={vitalSigns?.blood_pressure_diastolic || ''}
              onChange={(e) => updateField('blood_pressure_diastolic', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heart_rate">FC (bpm)</Label>
            <Input
              id="heart_rate"
              type="number"
              placeholder="72"
              value={vitalSigns?.heart_rate || ''}
              onChange={(e) => updateField('heart_rate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="respiratory_rate">FR (irpm)</Label>
            <Input
              id="respiratory_rate"
              type="number"
              placeholder="16"
              value={vitalSigns?.respiratory_rate || ''}
              onChange={(e) => updateField('respiratory_rate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperatura (°C)</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              placeholder="36.5"
              value={vitalSigns?.temperature || ''}
              onChange={(e) => updateField('temperature', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="oxygen_saturation">SpO2 (%)</Label>
            <Input
              id="oxygen_saturation"
              type="number"
              placeholder="98"
              value={vitalSigns?.oxygen_saturation || ''}
              onChange={(e) => updateField('oxygen_saturation', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blood_glucose">Glicemia (mg/dL)</Label>
            <Input
              id="blood_glucose"
              type="number"
              placeholder="90"
              value={vitalSigns?.blood_glucose || ''}
              onChange={(e) => updateField('blood_glucose', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="70.0"
              value={vitalSigns?.weight || ''}
              onChange={(e) => {
                updateField('weight', e.target.value)
                calculateBMI()
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="height">Altura (cm)</Label>
            <Input
              id="height"
              type="number"
              placeholder="170"
              value={vitalSigns?.height || ''}
              onChange={(e) => {
                updateField('height', e.target.value)
                calculateBMI()
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bmi">IMC</Label>
            <Input
              id="bmi"
              type="number"
              step="0.1"
              placeholder="24.3"
              value={vitalSigns?.bmi || ''}
              readOnly
              className="bg-muted"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

