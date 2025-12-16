'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, X } from 'lucide-react'

export default function NovaSalaPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    equipment: [] as string[],
    active: true,
  })
  const [newEquipment, setNewEquipment] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da sala é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('clinic_rooms')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          equipment: formData.equipment.length > 0 ? formData.equipment : null,
          active: formData.active,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Sala criada com sucesso!',
        description: 'A sala foi cadastrada no sistema.',
      })

      router.push('/dashboard/salas')
    } catch (error: any) {
      console.error('Erro ao criar sala:', error)
      toast({
        title: 'Erro ao criar sala',
        description: error.message || 'Não foi possível criar a sala.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const addEquipment = () => {
    if (newEquipment.trim() && !formData.equipment.includes(newEquipment.trim())) {
      setFormData({
        ...formData,
        equipment: [...formData.equipment, newEquipment.trim()],
      })
      setNewEquipment('')
    }
  }

  const removeEquipment = (equip: string) => {
    setFormData({
      ...formData,
      equipment: formData.equipment.filter((e) => e !== equip),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/salas">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Nova Sala
        </h1>
        <p className="text-muted-foreground mt-1">
          Adicione uma nova sala física à clínica
        </p>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Sala</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome da Sala <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sala 1, Sala de Exames, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a sala e suas características..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade (pessoas)</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="Ex: 2, 3, 5..."
              />
            </div>

            <div className="space-y-2">
              <Label>Equipamentos</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Mesa, Cadeiras, Computador..."
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addEquipment()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addEquipment}>
                  Adicionar
                </Button>
              </div>
              {formData.equipment.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.equipment.map((equip, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md"
                    >
                      <span className="text-sm">{equip}</span>
                      <button
                        type="button"
                        onClick={() => removeEquipment(equip)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Adicione os equipamentos disponíveis nesta sala.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, active: checked as boolean })
                }
              />
              <Label htmlFor="active" className="cursor-pointer">
                Sala ativa (disponível para agendamentos)
              </Label>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/dashboard/salas">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Salvando...' : 'Salvar Sala'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

