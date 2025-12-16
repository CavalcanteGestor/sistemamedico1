'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { physicalExamSchema, type PhysicalExamInput } from '@/lib/validations/physical-exam'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VitalSignsForm } from './vital-signs-form'

interface PhysicalExamFormProps {
  initialData?: PhysicalExamInput
  onSubmit: (data: PhysicalExamInput) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export function PhysicalExamForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: PhysicalExamFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PhysicalExamInput>({
    resolver: zodResolver(physicalExamSchema),
    defaultValues: initialData || {
      vital_signs: {},
    },
  })

  const vitalSigns = watch('vital_signs')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <VitalSignsForm
        value={vitalSigns}
        onChange={(value) => setValue('vital_signs', value)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Aspecto Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="general_appearance">Aspecto Geral</Label>
            <Textarea
              id="general_appearance"
              placeholder="Estado geral, nível de consciência, hidratação, cor da pele..."
              rows={3}
              {...register('general_appearance')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exame por Sistemas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="head_and_neck">Cabeça e Pescoço</Label>
            <Textarea
              id="head_and_neck"
              placeholder="Inspeção da cabeça, pescoço, tireoide, linfonodos..."
              rows={2}
              {...register('head_and_neck')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardiovascular">Cardiovascular</Label>
            <Textarea
              id="cardiovascular"
              placeholder="Inspeção, palpação, percussão, ausculta cardíaca..."
              rows={2}
              {...register('cardiovascular')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="respiratory">Respiratório</Label>
            <Textarea
              id="respiratory"
              placeholder="Inspeção, palpação, percussão, ausculta pulmonar..."
              rows={2}
              {...register('respiratory')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="abdominal">Abdome</Label>
            <Textarea
              id="abdominal"
              placeholder="Inspeção, ausculta, percussão, palpação abdominal..."
              rows={2}
              {...register('abdominal')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lymph_nodes">Linfonodos</Label>
            <Textarea
              id="lymph_nodes"
              placeholder="Palpação de linfonodos regionais..."
              rows={2}
              {...register('lymph_nodes')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neurological">Neurológico</Label>
            <Textarea
              id="neurological"
              placeholder="Estado mental, nervos cranianos, força muscular, sensibilidade, reflexos..."
              rows={3}
              {...register('neurological')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="musculoskeletal">Musculoesquelético</Label>
            <Textarea
              id="musculoskeletal"
              placeholder="Inspeção, palpação, mobilidade articular, força muscular..."
              rows={2}
              {...register('musculoskeletal')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extremities">Extremidades</Label>
            <Textarea
              id="extremities"
              placeholder="Inspeção de membros superiores e inferiores, pulsos, edemas..."
              rows={2}
              {...register('extremities')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skin">Tegumentar (Pele)</Label>
            <Textarea
              id="skin"
              placeholder="Inspeção da pele, unhas, cabelos, lesões..."
              rows={2}
              {...register('skin')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="other">Outros</Label>
            <Textarea
              id="other"
              placeholder="Outros achados do exame físico..."
              rows={2}
              {...register('other')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações Adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="additional_notes">Notas Adicionais</Label>
            <Textarea
              id="additional_notes"
              placeholder="Observações complementares sobre o exame físico..."
              rows={3}
              {...register('additional_notes')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Exame Físico'}
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

