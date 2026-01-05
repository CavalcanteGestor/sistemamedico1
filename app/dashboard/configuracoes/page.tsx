'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Save, Building2, Mail, Phone, MapPin, Clock, Image as ImageIcon, X, Upload } from 'lucide-react'
import { PushNotificationSetup } from '@/components/notifications/push-notification-setup'

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    clinic_name: '',
    clinic_email: '',
    clinic_phone: '',
    clinic_address: '',
    clinic_city: '',
    clinic_state: '',
    clinic_zip_code: '',
    clinic_cnpj: '',
    operating_hours: '',
    notes: '',
    clinic_logo_url: '',
  })
  const [logoUploading, setLogoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings({
          clinic_name: data.clinic_name || '',
          clinic_email: data.clinic_email || '',
          clinic_phone: data.clinic_phone || '',
          clinic_address: data.clinic_address || '',
          clinic_city: data.clinic_city || '',
          clinic_state: data.clinic_state || '',
          clinic_zip_code: data.clinic_zip_code || '',
          clinic_cnpj: data.clinic_cnpj || '',
          operating_hours: data.operating_hours || '',
          notes: data.notes || '',
          clinic_logo_url: data.clinic_logo_url || '',
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      // Verificar se já existe configuração
      const { data: existing } = await supabase
        .from('clinic_settings')
        .select('id')
        .single()

      let error
      if (existing) {
        // Atualizar
        const { error: updateError } = await supabase
          .from('clinic_settings')
          .update(settings)
          .eq('id', existing.id)

        error = updateError
      } else {
        // Criar
        const { error: insertError } = await supabase
          .from('clinic_settings')
          .insert(settings)

        error = insertError
      }

      if (error) throw error

      toast({
        title: 'Configurações salvas!',
        description: 'As configurações da clínica foram atualizadas com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message || 'Não foi possível salvar as configurações',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem (PNG, JPG, etc.)',
        variant: 'destructive',
      })
      return
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A logo deve ter no máximo 5MB',
        variant: 'destructive',
      })
      return
    }

    try {
      setLogoUploading(true)

      // Deletar logo antiga se existir
      if (settings.clinic_logo_url) {
        try {
          const oldPath = settings.clinic_logo_url.split('/clinic-assets/')[1]
          if (oldPath) {
            await supabase.storage.from('clinic-assets').remove([oldPath])
          }
        } catch (err) {
          // Ignorar erro ao deletar logo antiga
        }
      }

      // Upload da nova logo
      const timestamp = Date.now()
      const fileName = `logo-${timestamp}.${file.name.split('.').pop()}`
      const filePath = `logos/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath)

      // Atualizar settings com nova URL
      const newSettings = { ...settings, clinic_logo_url: urlData.publicUrl }
      setSettings(newSettings)

      // Salvar no banco imediatamente
      const { data: existing } = await supabase
        .from('clinic_settings')
        .select('id')
        .single()

      if (existing) {
        await supabase
          .from('clinic_settings')
          .update({ clinic_logo_url: urlData.publicUrl })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('clinic_settings')
          .insert({ clinic_logo_url: urlData.publicUrl })
      }

      // Atualizar template de email do Supabase com a nova logo
      try {
        const response = await fetch('/api/admin/update-email-template', {
          method: 'POST',
        })
        const result = await response.json()
        
        if (result.success) {
          toast({
            title: 'Logo atualizada!',
            description: 'A logo da clínica foi atualizada e o template de email foi atualizado automaticamente.',
          })
        } else if (result.manualUpdate) {
          toast({
            title: 'Logo atualizada!',
            description: 'A logo foi salva. Para atualizar o template de email, acesse o Supabase Dashboard manualmente.',
            variant: 'default',
          })
        } else {
          toast({
            title: 'Logo atualizada!',
            description: 'A logo da clínica foi atualizada com sucesso.',
          })
        }
      } catch (templateError) {
        // Não bloquear se falhar a atualização do template
        toast({
          title: 'Logo atualizada!',
          description: 'A logo da clínica foi atualizada com sucesso.',
        })
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload da logo:', error)
      toast({
        title: 'Erro ao fazer upload',
        description: error.message || 'Não foi possível fazer upload da logo',
        variant: 'destructive',
      })
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = async () => {
    if (!settings.clinic_logo_url) return

    try {
      setLogoUploading(true)

      // Deletar do storage
      try {
        const path = settings.clinic_logo_url.split('/clinic-assets/')[1]
        if (path) {
          await supabase.storage.from('clinic-assets').remove([path])
        }
      } catch (err) {
        // Ignorar erro
      }

      // Atualizar settings
      const newSettings = { ...settings, clinic_logo_url: '' }
      setSettings(newSettings)

      // Atualizar no banco
      const { data: existing } = await supabase
        .from('clinic_settings')
        .select('id')
        .single()

      if (existing) {
        await supabase
          .from('clinic_settings')
          .update({ clinic_logo_url: null })
          .eq('id', existing.id)
      }

      // Atualizar template de email do Supabase (remover logo)
      try {
        await fetch('/api/admin/update-email-template', {
          method: 'POST',
        })
      } catch (templateError) {
        // Não bloquear se falhar
      }

      toast({
        title: 'Logo removida!',
        description: 'A logo foi removida com sucesso e o template de email foi atualizado.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao remover logo',
        description: error.message || 'Não foi possível remover a logo',
        variant: 'destructive',
      })
    } finally {
      setLogoUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da clínica</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Clínica
            </CardTitle>
            <CardDescription>Configure os dados básicos da clínica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinic_name">Nome da Clínica *</Label>
                <Input
                  id="clinic_name"
                  value={settings.clinic_name}
                  onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_cnpj">CNPJ</Label>
                <Input
                  id="clinic_cnpj"
                  value={settings.clinic_cnpj}
                  onChange={(e) => setSettings({ ...settings, clinic_cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinic_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="clinic_email"
                  type="email"
                  value={settings.clinic_email}
                  onChange={(e) => setSettings({ ...settings, clinic_email: e.target.value })}
                  placeholder="contato@clinica.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="clinic_phone"
                  value={settings.clinic_phone}
                  onChange={(e) => setSettings({ ...settings, clinic_phone: e.target.value })}
                  placeholder="(00) 0000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic_address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </Label>
              <Input
                id="clinic_address"
                value={settings.clinic_address}
                onChange={(e) => setSettings({ ...settings, clinic_address: e.target.value })}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinic_city">Cidade</Label>
                <Input
                  id="clinic_city"
                  value={settings.clinic_city}
                  onChange={(e) => setSettings({ ...settings, clinic_city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_state">Estado</Label>
                <Input
                  id="clinic_state"
                  value={settings.clinic_state}
                  onChange={(e) => setSettings({ ...settings, clinic_state: e.target.value })}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_zip_code">CEP</Label>
                <Input
                  id="clinic_zip_code"
                  value={settings.clinic_zip_code}
                  onChange={(e) => setSettings({ ...settings, clinic_zip_code: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Logo da Clínica
            </CardTitle>
            <CardDescription>
              A logo aparecerá em relatórios, receitas e outros documentos gerados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              {settings.clinic_logo_url ? (
                <div className="relative">
                  <img
                    src={settings.clinic_logo_url}
                    alt="Logo da Clínica"
                    className="h-32 w-32 object-contain border rounded-lg p-2 bg-background"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={handleRemoveLogo}
                    disabled={logoUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="h-32 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <Label htmlFor="logo-upload">Upload de Logo</Label>
                <input
                  ref={fileInputRef}
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoUploading ? 'Enviando...' : settings.clinic_logo_url ? 'Alterar Logo' : 'Selecionar Logo'}
                  </Button>
                  {settings.clinic_logo_url && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveLogo}
                      disabled={logoUploading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: PNG, JPG, GIF, WEBP. Tamanho máximo: 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário de Funcionamento
            </CardTitle>
            <CardDescription>Configure os horários de atendimento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operating_hours">Horários</Label>
              <Textarea
                id="operating_hours"
                value={settings.operating_hours}
                onChange={(e) => setSettings({ ...settings, operating_hours: e.target.value })}
                placeholder="Ex: Segunda a Sexta: 8h às 18h&#10;Sábado: 8h às 12h"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
            <CardDescription>Observações gerais sobre a clínica</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={settings.notes}
                onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <PushNotificationSetup />

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  )
}

