'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react'

export default function AtualizarTemplateEmailPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; template?: string } | null>(null)

  const handleUpdateTemplate = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch('/api/admin/update-doctor-invite-template', {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar template')
      }

      setResult({
        success: data.success,
        message: data.message,
        template: data.template,
      })

      toast({
        title: data.success ? '✅ Template atualizado!' : '⚠️ Atenção',
        description: data.message || 'Template processado',
        variant: data.success ? 'default' : 'destructive',
      })
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erro ao atualizar template',
      })
      toast({
        title: 'Erro ao atualizar template',
        description: error.message || 'Não foi possível atualizar o template',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Atualizar Template de Email
        </h1>
        <p className="text-muted-foreground">
          Atualiza o template de email de convite de médicos no Supabase
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template de Email de Convite</CardTitle>
          <CardDescription>
            Esta ação atualizará o template de email usado para enviar convites aos médicos.
            O template será personalizado com o nome da clínica e logo (se configurado).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              O template será atualizado no Supabase usando as configurações da clínica.
              Certifique-se de que:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>O nome da clínica está configurado em <strong>Configurações</strong></li>
              <li>A variável <code>SUPABASE_ACCESS_TOKEN</code> está configurada nas variáveis de ambiente</li>
              <li>Você está logado como administrador ou desenvolvedor</li>
            </ul>
          </div>

          <Button
            onClick={handleUpdateTemplate}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Atualizar Template no Supabase
              </>
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{result.message}</p>
                  {result.template && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Ver template gerado
                      </summary>
                      <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto max-h-96">
                        {result.template}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1. Template HTML:</strong> O sistema lê o arquivo <code>TEMPLATE_EMAIL_CONVITE_MEDICO.html</code>
          </p>
          <p>
            <strong>2. Personalização:</strong> Substitui as variáveis pelo nome da clínica e adiciona a logo
          </p>
          <p>
            <strong>3. Atualização:</strong> Envia o template atualizado para o Supabase via Management API
          </p>
          <p>
            <strong>4. Pronto:</strong> Todos os próximos emails de convite usarão o novo template
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

