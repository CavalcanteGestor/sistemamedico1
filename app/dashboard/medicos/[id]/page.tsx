'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function MedicoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [testingMessage, setTestingMessage] = useState(false)
  const [doctor, setDoctor] = useState<any>(null)
  const [specialties, setSpecialties] = useState<any[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    crm: '',
    specialty_id: '',
    phone: '',
    email: '',
    whatsapp_phone: '',
    active: true,
  })
  const supabase = createClient()

  useEffect(() => {
    checkPermissionsAndLoad()
  }, [params.id])

  // Verificar role do usuário atual e se é o próprio perfil
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      setCurrentUserRole(profile?.role || null)
      
      // Verificar se é o próprio perfil
      if (doctor?.user_id === user.id) {
        setIsOwnProfile(true)
      }
    }
    
    if (doctor) {
      checkUserRole()
    }
  }, [doctor, supabase])

  const checkPermissionsAndLoad = async () => {
    try {
      // Verificar permissões
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const userRole = profile?.role

      // Se for médico, verificar se pode editar este médico (apenas o próprio)
      if (userRole === 'medico') {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id, user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!doctor || doctor.id !== params.id) {
          toast({
            title: 'Acesso negado',
            description: 'Você só pode editar seus próprios dados.',
            variant: 'destructive',
          })
          router.push('/dashboard/medico')
          return
        }
      } else if (!['admin', 'recepcionista', 'desenvolvedor'].includes(userRole || '')) {
        // Apenas admin, recepcionista, desenvolvedor ou o próprio médico podem editar
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para editar médicos.',
          variant: 'destructive',
        })
        router.push('/dashboard')
        return
      }

      // Carregar dados
      loadDoctor()
      loadSpecialties()
    } catch (error: any) {
      console.error('Erro ao verificar permissões:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar permissões.',
        variant: 'destructive',
      })
      router.push('/dashboard')
    }
  }

  const loadDoctor = async () => {
    try {
      // Primeiro buscar o médico
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select(`
          *,
          specialties:specialty_id (
            id,
            name
          )
        `)
        .eq('id', params.id)
        .single()

      if (doctorError) throw doctorError

      if (!doctorData) {
        toast({
          title: 'Médico não encontrado',
          description: 'O médico solicitado não existe no sistema.',
          variant: 'destructive',
        })
        router.push('/dashboard/medicos')
        return
      }

      // Se o médico tiver user_id, buscar o profile separadamente
      let profileData = null
      if (doctorData.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', doctorData.user_id)
          .maybeSingle()
        
        profileData = profile
      }

      // Combinar dados
      const combinedData = {
        ...doctorData,
        profiles: profileData,
      }

      setDoctor(combinedData)
      setFormData({
        name: doctorData.name || '',
        crm: doctorData.crm || '',
        specialty_id: doctorData.specialty_id || '',
        phone: doctorData.phone || '',
        email: doctorData.email || '',
        whatsapp_phone: doctorData.whatsapp_phone || '',
        active: doctorData.active ?? true,
      })
    } catch (error: any) {
      console.error('Erro ao carregar médico:', error)
      toast({
        title: 'Erro ao carregar médico',
        description: error?.message || 'Não foi possível carregar os dados do médico.',
        variant: 'destructive',
      })
      router.push('/dashboard/medicos')
    } finally {
      setLoading(false)
    }
  }

  const loadSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('name')

      if (error) throw error
      setSpecialties(data || [])
    } catch (error) {
      console.error('Erro ao carregar especialidades:', error)
    }
  }

  const handleCreateLogin = async () => {
    if (!formData.name || !formData.crm || !formData.email || !formData.phone) {
      toast({
        title: 'Campos obrigatórios faltando',
        description: 'Preencha nome, CRM, email e telefone antes de criar o login.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)

      // Chamar API para criar médico com login (usando dados existentes)
      const response = await fetch('/api/doctors/create-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctor_id: params.id,
          name: formData.name,
          crm: formData.crm,
          email: formData.email,
          phone: formData.phone,
          specialty_id: formData.specialty_id || null,
          whatsapp_phone: formData.whatsapp_phone || null,
          active: formData.active,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar login')
      }

      // Mostrar mensagem apropriada
      let description = 'O login foi criado com sucesso.'
      if (result.emailSent) {
        description = 'Login criado com sucesso! Um email foi enviado para o médico com um link para definir sua própria senha.'
      } else if (result.credentials?.password) {
        description = `Login criado com sucesso!\n\nCredenciais: Email: ${result.credentials.email}, Senha: ${result.credentials.password}\n\nO médico deve alterar a senha no primeiro acesso.`
      }

      toast({
        title: 'Login criado com sucesso!',
        description,
        duration: result.emailSent ? 8000 : 15000,
      })

      // Recarregar dados
      loadDoctor()
    } catch (error: any) {
      toast({
        title: 'Erro ao criar login',
        description: error.message || 'Não foi possível criar o login.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)

      // Formatar WhatsApp phone se fornecido
      let whatsappPhone = formData.whatsapp_phone
      if (whatsappPhone && !whatsappPhone.includes('@s.whatsapp.net')) {
        const cleaned = whatsappPhone.replace(/\D/g, '')
        if (cleaned.length >= 10) {
          whatsappPhone = `${cleaned}@s.whatsapp.net`
        } else {
          whatsappPhone = ''
        }
      }

      // Verificar permissões antes de atualizar
      const userRole = currentUserRole
      const isAdminRole = ['admin', 'recepcionista', 'desenvolvedor'].includes(userRole || '')
      
      // Se for médico editando próprio perfil, não pode alterar campos administrativos
      const updateData: any = {
        phone: formData.phone,
        whatsapp_phone: whatsappPhone || null,
      }

      // Campos administrativos apenas para admin/recepcionista/desenvolvedor
      if (isAdminRole) {
        updateData.name = formData.name
        updateData.crm = formData.crm
        updateData.specialty_id = formData.specialty_id || null
        updateData.email = formData.email
        updateData.active = formData.active
      }

      const { error } = await supabase
        .from('doctors')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      toast({
        title: 'Médico atualizado com sucesso!',
        description: 'Os dados do médico foram salvos.',
      })

      // Recarregar dados
      loadDoctor()
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar médico',
        description: error.message || 'Não foi possível atualizar o médico.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDoctor = async () => {
    if (!doctor) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/doctors/${params.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir médico')
      }

      toast({
        title: 'Médico excluído com sucesso!',
        description: `O médico ${doctor.name} foi excluído do sistema.`,
      })

      // Redirecionar para lista de médicos
      router.push('/dashboard/medicos')
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir médico',
        description: error.message || 'Não foi possível excluir o médico.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!doctor) {
    return null
  }

  const hasLogin = !!doctor.user_id
  const profileRole = doctor.profiles?.role
  const canEditAdminFields = ['admin', 'recepcionista', 'desenvolvedor'].includes(currentUserRole || '')
  const canEdit = isOwnProfile || canEditAdminFields
  const canDelete = ['admin', 'desenvolvedor'].includes(currentUserRole || '')

  return (
    <div>
      <Link href="/dashboard/medicos">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Médicos
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detalhes do Médico</CardTitle>
              <CardDescription>
                {hasLogin 
                  ? 'Médico possui login no sistema' 
                  : 'Médico ainda não possui login - use a página de cadastro para criar login'}
              </CardDescription>
            </div>
            {hasLogin ? (
              <div className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800">
                Com Login
              </div>
            ) : (
              <div className="px-3 py-1 rounded text-sm bg-orange-100 text-orange-800">
                Sem Login
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={!canEditAdminFields}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="crm">CRM *</Label>
                <Input
                  id="crm"
                  value={formData.crm}
                  onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                  required
                  disabled={!canEditAdminFields}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty_id">Especialidade</Label>
              <Select
                value={formData.specialty_id}
                onValueChange={(value) => setFormData({ ...formData, specialty_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              {canEditAdminFields && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={hasLogin} // Email não pode ser alterado se já tiver login
                  />
                  {hasLogin && (
                    <p className="text-xs text-muted-foreground">
                      Email não pode ser alterado pois o médico já possui login
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">
                Telefone WhatsApp (para notificações de agendamentos)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="whatsapp_phone"
                  placeholder="5599999999@s.whatsapp.net ou apenas números"
                  className="flex-1"
                  value={formData.whatsapp_phone}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const whatsappPhone = formData.whatsapp_phone
                    if (!whatsappPhone) {
                      toast({
                        title: 'Telefone necessário',
                        description: 'Por favor, preencha o telefone WhatsApp primeiro.',
                        variant: 'destructive',
                      })
                      return
                    }

                    try {
                      setTestingMessage(true)
                      
                      // Formatar telefone
                      let formattedPhone = whatsappPhone
                      if (!formattedPhone.includes('@s.whatsapp.net')) {
                        const cleaned = formattedPhone.replace(/\D/g, '')
                        if (cleaned.length >= 10) {
                          formattedPhone = `${cleaned}@s.whatsapp.net`
                        } else {
                          throw new Error('Telefone inválido')
                        }
                      }

                      // Enviar mensagem de teste (não deve ativar atendimento humano)
                      const response = await fetch('/api/whatsapp/send', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          phone: formattedPhone,
                          message: '✅ *Mensagem de Teste*\n\nEste é um teste do sistema de notificações. Se você recebeu esta mensagem, o número está configurado corretamente!',
                          isTest: true, // Flag para não ativar atendimento humano
                        }),
                      })

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}))
                        throw new Error(errorData.error || 'Erro ao enviar mensagem de teste')
                      }

                      toast({
                        title: '✅ Mensagem enviada com sucesso!',
                        description: 'A mensagem de teste foi enviada. O número será salvo quando você salvar as alterações.',
                        duration: 6000, // Mostrar por 6 segundos para dar tempo de ler
                      })
                    } catch (error: any) {
                      toast({
                        title: 'Erro ao enviar teste',
                        description: error.message || 'Não foi possível enviar a mensagem de teste.',
                        variant: 'destructive',
                      })
                    } finally {
                      setTestingMessage(false)
                    }
                  }}
                  disabled={testingMessage || !formData.whatsapp_phone}
                >
                  {testingMessage ? 'Enviando...' : 'Testar Mensagem'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formato: 5599999999@s.whatsapp.net ou apenas números (será formatado automaticamente). 
                Use o botão "Testar Mensagem" para verificar se o número está correto.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="active">Médico ativo</Label>
            </div>

            {!hasLogin && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
                <p className="text-sm text-orange-800 font-semibold">
                  ⚠️ Este médico ainda não possui login no sistema.
                </p>
                <p className="text-sm text-orange-700">
                  Para criar o login completo, você pode:
                </p>
                <ol className="text-sm text-orange-700 list-decimal list-inside space-y-1 ml-2">
                  <li>Preencher todos os campos acima e salvar</li>
                  <li>Clicar no botão abaixo para criar login automaticamente</li>
                </ol>
                <Button
                  type="button"
                  variant="default"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={handleCreateLogin}
                  disabled={saving}
                >
                  Criar Login para Este Médico
                </Button>
              </div>
            )}

            <div className="flex gap-4 justify-between">
              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                <Link href="/dashboard/medicos">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>

              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      disabled={deleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleting ? 'Excluindo...' : 'Excluir Médico'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-600">
                        ⚠️ Confirmar Exclusão
                      </AlertDialogTitle>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p>
                          Tem certeza que deseja excluir o médico <strong>{doctor.name}</strong>?
                        </p>
                        <p className="font-semibold">
                          Esta ação irá:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Excluir permanentemente o registro do médico</li>
                          {hasLogin && (
                            <>
                              <li>Excluir o usuário (login) associado ao médico</li>
                              <li>Remover o perfil do médico do sistema</li>
                            </>
                          )}
                          <li>Manter agendamentos passados (histórico preservado)</li>
                        </ul>
                        <p className="text-red-600 font-semibold mt-4">
                          ⚠️ Esta ação não pode ser desfeita!
                        </p>
                      </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteDoctor}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleting}
                      >
                        {deleting ? 'Excluindo...' : 'Sim, excluir médico'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

