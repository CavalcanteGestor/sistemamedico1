'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { anamnesisSchema, type AnamnesisInput } from '@/lib/validations/anamnesis'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, X } from 'lucide-react'

interface AnamnesisFormProps {
  initialData?: AnamnesisInput
  onSubmit: (data: AnamnesisInput) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

const REVIEW_SYSTEMS = {
  constitutional: 'Constitucionais (febre, perda de peso, fadiga)',
  eyes: 'Oculares (visão, dor, secreção)',
  ears_nose_throat: 'Otorrinolaringológicos (audição, olfato, deglutição)',
  cardiovascular: 'Cardiovasculares (dor no peito, palpitações, falta de ar aos esforços)',
  respiratory: 'Respiratórios (tosse, expectoração, falta de ar)',
  gastrointestinal: 'Gastrointestinais (náusea, vômito, dor abdominal, alteração do hábito intestinal)',
  genitourinary: 'Geniturinários (disúria, alteração na micção, alterações menstruais)',
  musculoskeletal: 'Musculoesqueléticos (dor, rigidez, limitação de movimentos)',
  integumentary: 'Tegumentares (lesões de pele, prurido, alterações de unhas/cabelos)',
  neurological: 'Neurológicos (cefaleia, tontura, convulsões, alterações de sensibilidade)',
  endocrine: 'Endócrinos (poliúria, polidipsia, alterações de peso, intolerância ao calor/frio)',
  hematologic: 'Hematológicos (sangramentos, equimoses, gânglios)',
  psychiatric: 'Psiquiátricos (humor, ansiedade, insônia, memória)',
}

export function AnamnesisForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: AnamnesisFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AnamnesisInput>({
    resolver: zodResolver(anamnesisSchema),
    defaultValues: initialData || {
      medications: [],
      allergies: [],
      review_of_systems: {},
    },
  })

  const medications = watch('medications') || []
  const allergies = watch('allergies') || []
  const reviewOfSystems = watch('review_of_systems') || {}

  const [newMedication, setNewMedication] = useState('')
  const [newAllergy, setNewAllergy] = useState('')

  const addMedication = () => {
    if (newMedication.trim()) {
      setValue('medications', [...medications, newMedication.trim()])
      setNewMedication('')
    }
  }

  const removeMedication = (index: number) => {
    setValue(
      'medications',
      medications.filter((_, i) => i !== index)
    )
  }

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setValue('allergies', [...allergies, newAllergy.trim()])
      setNewAllergy('')
    }
  }

  const removeAllergy = (index: number) => {
    setValue(
      'allergies',
      allergies.filter((_, i) => i !== index)
    )
  }

  const toggleReviewSystem = (system: string) => {
    const current = reviewOfSystems[system] || false
    setValue('review_of_systems', {
      ...reviewOfSystems,
      [system]: !current,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Queixa Principal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="chief_complaint">Queixa Principal *</Label>
            <Textarea
              id="chief_complaint"
              placeholder="Descreva a queixa principal do paciente..."
              rows={3}
              {...register('chief_complaint')}
            />
            {errors.chief_complaint && (
              <p className="text-sm text-destructive">{errors.chief_complaint.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>História da Doença Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="history_of_present_illness">HDA</Label>
            <Textarea
              id="history_of_present_illness"
              placeholder="Descreva a história da doença atual..."
              rows={5}
              {...register('history_of_present_illness')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>História Patológica Pregressa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="past_medical_history">História Patológica Pregressa</Label>
            <Textarea
              id="past_medical_history"
              placeholder="Doenças anteriores, cirurgias, hospitalizações..."
              rows={4}
              {...register('past_medical_history')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>História Familiar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="family_history">História Familiar</Label>
            <Textarea
              id="family_history"
              placeholder="Doenças hereditárias, histórico familiar de doenças..."
              rows={3}
              {...register('family_history')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>História Social e Hábitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="social_history">História Social</Label>
            <Textarea
              id="social_history"
              placeholder="Tabagismo, etilismo, uso de drogas, atividade física, situação familiar..."
              rows={3}
              {...register('social_history')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lifestyle">Estilo de Vida</Label>
            <Textarea
              id="lifestyle"
              placeholder="Hábitos alimentares, sono, atividade física regular..."
              rows={2}
              {...register('lifestyle')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occupational_history">História Ocupacional</Label>
            <Textarea
              id="occupational_history"
              placeholder="Ocupação atual, exposições ocupacionais, acidentes de trabalho..."
              rows={2}
              {...register('occupational_history')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medicações em Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do medicamento"
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addMedication()
                  }
                }}
              />
              <Button type="button" onClick={addMedication} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {medications.length > 0 && (
              <div className="space-y-2">
                {medications.map((med, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>{med}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alergias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Substância alérgica"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAllergy()
                  }
                }}
              />
              <Button type="button" onClick={addAllergy} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {allergies.length > 0 && (
              <div className="space-y-2">
                {allergies.map((allergy, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>{allergy}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAllergy(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revisão por Sistemas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(REVIEW_SYSTEMS).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={reviewOfSystems[key] || false}
                  onCheckedChange={() => toggleReviewSystem(key)}
                />
                <Label
                  htmlFor={key}
                  className="text-sm font-normal cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Anamnese'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

