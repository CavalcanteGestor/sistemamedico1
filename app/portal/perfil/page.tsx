'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function PatientPerfilPage() {
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadPatient()
  }, [])

  const loadPatient = async () => {
    try {
      setLoading(true)
      
      // Aguardar um pouco para garantir que a sessão está pronta
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verificar autenticação e sessão
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Erro de autenticação:', authError)
        toast({
          title: 'Erro de autenticação',
          description: 'Não foi possível verificar sua identidade. Faça login novamente.',
          variant: 'destructive',
        })
        return
      }

      if (!user) {
        console.warn('Usuário não autenticado ou sessão inválida')
        toast({
          title: 'Não autenticado',
          description: 'Você precisa fazer login para acessar seu perfil.',
          variant: 'destructive',
        })
        return
      }

      console.log('Buscando paciente para user_id:', user.id)

      // Usar API route server-side para evitar problemas de headers/406
      const response = await fetch('/api/portal/patient-profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      })

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Resposta não é JSON:', text.substring(0, 200))
        throw new Error('Resposta inválida do servidor')
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        
        if (response.status === 404) {
          // Paciente não encontrado - tentar buscar por email como fallback
          const userEmail = user.email
          if (userEmail) {
            console.log('Tentando buscar paciente pelo email via API:', userEmail)
            // Usar o cliente diretamente apenas para esta busca alternativa
            try {
              const { data: patientByEmail, error: emailError } = await supabase
                .from('patients')
                .select('id, name, email, cpf, birth_date, phone, address, city, state, zip_code, emergency_contact, emergency_phone, user_id')
                .eq('email', userEmail)
                .maybeSingle()
              
              if (patientByEmail && !emailError) {
                if (!patientByEmail.user_id) {
                  toast({
                    title: 'Configuração pendente',
                    description: 'Seu perfil ainda está sendo configurado. Aguarde alguns instantes e recarregue a página.',
                    variant: 'default',
                  })
                } else {
                  toast({
                    title: 'Perfil não encontrado',
                    description: 'Não foi possível encontrar seu perfil. Entre em contato com a clínica.',
                    variant: 'destructive',
                  })
                }
                return
              }
            } catch (emailQueryError) {
              console.error('Erro ao buscar por email:', emailQueryError)
            }
          }
          
          toast({
            title: 'Perfil não encontrado',
            description: 'Não foi possível encontrar seu perfil de paciente. Entre em contato com a clínica para vincular sua conta.',
            variant: 'destructive',
          })
        } else if (response.status === 401) {
          toast({
            title: 'Não autenticado',
            description: 'Você precisa fazer login para acessar seu perfil.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Erro ao carregar perfil',
            description: errorData.error || 'Não foi possível carregar suas informações. Tente novamente mais tarde.',
            variant: 'destructive',
          })
        }
        return
      }

      const result = await response.json()

      if (!result.data) {
        console.warn('Dados do paciente vazios na resposta da API')
        toast({
          title: 'Perfil não encontrado',
          description: 'Não foi possível carregar suas informações. Entre em contato com a clínica.',
          variant: 'destructive',
        })
        return
      }

      console.log('Paciente carregado com sucesso via API:', result.data.name)
      setPatient(result.data)
    } catch (error: any) {
      const errorDetails = {
        message: error?.message || 'Erro desconhecido',
        code: error?.code || error?.status,
        details: error?.details,
        hint: error?.hint,
        name: error?.name,
        stack: error?.stack,
      }
      
      console.error('Erro ao carregar perfil:', errorDetails)
      
      toast({
        title: 'Erro ao carregar perfil',
        description: errorDetails.message || 'Não foi possível carregar suas informações. Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      setSaving(true)
      const formData = new FormData(e.currentTarget)
      const updates: any = {}

      if (formData.get('phone')) updates.phone = formData.get('phone')
      if (formData.get('address')) updates.address = formData.get('address')
      if (formData.get('city')) updates.city = formData.get('city')
      if (formData.get('state')) updates.state = formData.get('state')
      if (formData.get('zip_code')) updates.zip_code = formData.get('zip_code')
      if (formData.get('emergency_contact')) updates.emergency_contact = formData.get('emergency_contact')
      if (formData.get('emergency_phone')) updates.emergency_phone = formData.get('emergency_phone')

      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patient.id)

      if (error) throw error

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      })

      loadPatient()
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message || 'Não foi possível atualizar o perfil',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  if (!patient) {
    return <div>Paciente não encontrado</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={patient.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={patient.cpf} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input value={new Date(patient.birth_date).toLocaleDateString('pt-BR')} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" name="phone" defaultValue={patient.phone} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={patient.email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" defaultValue={patient.address || ''} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" defaultValue={patient.city || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" name="state" defaultValue={patient.state || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input id="zip_code" name="zip_code" defaultValue={patient.zip_code || ''} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Contato de Emergência</Label>
                <Input id="emergency_contact" name="emergency_contact" defaultValue={patient.emergency_contact || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_phone">Telefone de Emergência</Label>
                <Input id="emergency_phone" name="emergency_phone" defaultValue={patient.emergency_phone || ''} />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

