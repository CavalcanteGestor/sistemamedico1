'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Search, Edit, Trash2, MapPin, Users, Wrench } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface ClinicRoom {
  id: string
  name: string
  description: string | null
  capacity: number | null
  equipment: string[] | null
  active: boolean
  created_at: string
  updated_at: string
}

export default function SalasPage() {
  const [rooms, setRooms] = useState<ClinicRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<ClinicRoom | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clinic_rooms')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setRooms(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar salas:', error)
      toast({
        title: 'Erro ao carregar salas',
        description: error.message || 'Não foi possível carregar as salas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!roomToDelete) return

    try {
      setDeleting(true)

      // Verificar se há agendamentos usando esta sala
      const { data: appointments, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('room_id', roomToDelete.id)
        .limit(1)

      if (checkError) throw checkError

      if (appointments && appointments.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Esta sala está sendo usada em agendamentos. Desative-a ao invés de excluir.',
          variant: 'destructive',
        })
        setDeleteDialogOpen(false)
        setRoomToDelete(null)
        return
      }

      const { error } = await supabase
        .from('clinic_rooms')
        .delete()
        .eq('id', roomToDelete.id)

      if (error) throw error

      toast({
        title: 'Sala excluída',
        description: 'A sala foi excluída com sucesso.',
      })

      setDeleteDialogOpen(false)
      setRoomToDelete(null)
      loadRooms()
    } catch (error: any) {
      console.error('Erro ao excluir sala:', error)
      toast({
        title: 'Erro ao excluir sala',
        description: error.message || 'Não foi possível excluir a sala',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const toggleActive = async (room: ClinicRoom) => {
    try {
      const { error } = await supabase
        .from('clinic_rooms')
        .update({ active: !room.active })
        .eq('id', room.id)

      if (error) throw error

      toast({
        title: room.active ? 'Sala desativada' : 'Sala ativada',
        description: `A sala "${room.name}" foi ${room.active ? 'desativada' : 'ativada'} com sucesso.`,
      })

      loadRooms()
    } catch (error: any) {
      console.error('Erro ao alterar status da sala:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar o status da sala',
        variant: 'destructive',
      })
    }
  }

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Gerenciar Salas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as salas físicas da clínica
          </p>
        </div>
        <Link href="/dashboard/salas/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Sala
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Salas */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Carregando salas...</div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma sala encontrada.' : 'Nenhuma sala cadastrada.'}
            </p>
            {!searchTerm && (
              <Link href="/dashboard/salas/novo">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar primeira sala
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      {room.name}
                    </CardTitle>
                    {room.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {room.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={room.active ? 'default' : 'secondary'}>
                    {room.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {room.capacity && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Capacidade: {room.capacity} pessoa(s)</span>
                  </div>
                )}

                {room.equipment && room.equipment.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Wrench className="h-4 w-4" />
                      <span>Equipamentos:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {room.equipment.map((equip, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {equip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Link href={`/dashboard/salas/${room.id}/editar`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(room)}
                    className={room.active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                  >
                    {room.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRoomToDelete(room)
                      setDeleteDialogOpen(true)
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a sala "{roomToDelete?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setRoomToDelete(null)
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

