'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'

export default function NovaPrescricaoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<
    Array<{
      medication_id: string
      medication_name: string
      dosage: string
      frequency: string
      duration: string
      instructions: string
    }>
  >([])

  useEffect(() => {
    loadData()
    
    // Verificar se há template no sessionStorage
    const templateData = sessionStorage.getItem('prescription_template')
    if (templateData) {
      try {
        const template = JSON.parse(templateData)
        if (template.items && Array.isArray(template.items)) {
          setItems(template.items.map((item: any) => ({
            medication_id: '',
            medication_name: item.medication_name || '',
            dosage: item.dosage || '',
            frequency: item.frequency || '',
            duration: item.duration || '',
            instructions: item.instructions || '',
          })))
          if (template.notes) {
            setNotes(template.notes)
          }
          toast({
            title: 'Template aplicado!',
            description: 'O template foi carregado. Você pode editar os medicamentos.',
          })
          // Limpar template do storage
          sessionStorage.removeItem('prescription_template')
        }
      } catch (error) {
        console.error('Erro ao carregar template:', error)
      }
    }
  }, [])

  const loadData = async () => {
    try {
      const [patientsRes, doctorsRes, medicationsRes] = await Promise.all([
        supabase.from('patients').select('id, name').order('name'),
        supabase.from('doctors').select('id, name, crm').eq('active', true).order('name'),
        supabase.from('medications').select('id, name').order('name'),
      ])

      if (patientsRes.error) throw patientsRes.error
      if (doctorsRes.error) throw doctorsRes.error
      if (medicationsRes.error) throw medicationsRes.error

      setPatients(patientsRes.data || [])
      setDoctors(doctorsRes.data || [])
      setMedications(medicationsRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      })
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        medication_id: '',
        medication_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatient || !selectedDoctor) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione o paciente e o médico.',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'Erro',
        description: 'Por favor, adicione pelo menos um medicamento.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      // Criar prescrição
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: selectedPatient,
          doctor_id: selectedDoctor,
          prescription_date: prescriptionDate,
          notes: notes || null,
        })
        .select()
        .single()

      if (prescriptionError) throw prescriptionError

      // Criar itens da prescrição
      const prescriptionItems = items.map((item) => ({
        prescription_id: prescription.id,
        medication_id: item.medication_id || null,
        medication_name: item.medication_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions || null,
      }))

      const { error: itemsError } = await supabase
        .from('prescription_items')
        .insert(prescriptionItems)

      if (itemsError) throw itemsError

      toast({
        title: 'Prescrição criada com sucesso!',
        description: 'A prescrição foi cadastrada no sistema.',
      })

      router.push('/dashboard/prescricoes')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar prescrição',
        description: error.message || 'Não foi possível criar a prescrição',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/prescricoes">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Nova Prescrição</CardTitle>
          <CardDescription>Crie uma nova prescrição médica para um paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Paciente *</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor_id">Médico *</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - CRM: {doctor.crm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescription_date">Data da Prescrição *</Label>
              <Input
                id="prescription_date"
                type="date"
                value={prescriptionDate}
                onChange={(e) => setPrescriptionDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Medicamentos *</Label>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Medicamento
                </Button>
              </div>

              {items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Medicamento {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Medicamento *</Label>
                      <Select
                        value={item.medication_id}
                        onValueChange={(value) => {
                          const medication = medications.find((m) => m.id === value)
                          updateItem(index, 'medication_id', value)
                          updateItem(index, 'medication_name', medication?.name || '')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o medicamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {medications.map((medication) => (
                            <SelectItem key={medication.id} value={medication.id}>
                              {medication.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Ou digite o nome do medicamento"
                        value={item.medication_name}
                        onChange={(e) => updateItem(index, 'medication_name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Dosagem *</Label>
                      <Input
                        placeholder="Ex: 500mg"
                        value={item.dosage}
                        onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frequência *</Label>
                      <Input
                        placeholder="Ex: 3x ao dia"
                        value={item.frequency}
                        onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Duração *</Label>
                      <Input
                        placeholder="Ex: 7 dias"
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Instruções</Label>
                    <Textarea
                      placeholder="Instruções adicionais sobre o medicamento"
                      value={item.instructions}
                      onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações gerais sobre a prescrição"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Prescrição'}
              </Button>
              <Link href="/dashboard/prescricoes">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

