'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AIConsentProps {
  onAccept: () => void
  onDecline?: () => void
  isDoctor?: boolean
  userName?: string
}

export function AIConsent({ onAccept, onDecline, isDoctor = false, userName }: AIConsentProps) {
  const [accepted, setAccepted] = useState(false)
  const [readTerms, setReadTerms] = useState(false)

  const roleLabel = isDoctor ? 'Médico(a)' : 'Paciente'
  const nameLabel = userName || roleLabel

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            Termo de Consentimento para Uso de Inteligência Artificial
          </CardTitle>
          <CardDescription>
            Consentimento obrigatório para uso de tecnologias de IA na consulta de telemedicina
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Este termo é necessário quando a consulta utiliza recursos de 
              Inteligência Artificial (ChatGPT/OpenAI) para transcrição e geração de resumo médico.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Declaração de Consentimento</h3>
            
            <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/50">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">1. FINALIDADE</p>
                  <p className="text-muted-foreground">
                    A presente consulta de telemedicina utilizará tecnologias de Inteligência Artificial (IA), 
                    especificamente o serviço ChatGPT/OpenAI, para:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                    <li>Transcrição automática da conversa durante a consulta</li>
                    <li>Geração de resumo médico estruturado da consulta</li>
                    <li>Análise e processamento de informações clínicas</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">2. DADOS PROCESSADOS</p>
                  <p className="text-muted-foreground">
                    Para o funcionamento dos recursos de IA, serão processados os seguintes dados:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                    <li>Áudio da consulta (transcrição)</li>
                    <li>Anotações feitas pelo médico durante a consulta</li>
                    <li>Mensagens trocadas no chat da consulta</li>
                    <li>Informações clínicas relevantes para o resumo médico</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">3. SEGURANÇA E PRIVACIDADE</p>
                  <p className="text-muted-foreground">
                    O sistema adota medidas de segurança para proteger seus dados:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                    <li>Transmissão criptografada de dados</li>
                    <li>Armazenamento seguro conforme normas de proteção de dados</li>
                    <li>Processamento de dados por serviço confiável (OpenAI) com políticas de privacidade adequadas</li>
                    <li>Nenhum dado identificável é usado para treinamento de modelos pela OpenAI (conforme política atual)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">4. BENEFÍCIOS</p>
                  <p className="text-muted-foreground">
                    O uso de IA oferece os seguintes benefícios:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                    <li>Resumo médico completo e estruturado da consulta</li>
                    <li>Melhor documentação clínica</li>
                    <li>Facilitação no registro de informações importantes</li>
                    <li>Apoio na qualidade do atendimento médico</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">5. RESPONSABILIDADES</p>
                  <p className="text-muted-foreground">
                    Entendo que:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                    <li>O resumo gerado por IA é um apoio e será revisado pelo médico</li>
                    <li>A responsabilidade clínica permanece com o médico assistente</li>
                    <li>Posso solicitar revisão ou correção do resumo gerado</li>
                    <li>O consentimento pode ser revogado a qualquer momento (não afetando consultas já realizadas)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">6. CONSENTIMENTO LIVRE E INFORMADO</p>
                  <p className="text-muted-foreground">
                    Declaro que li e compreendi este termo de consentimento e que:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                    <li>Minha participação é voluntária</li>
                    <li>Tenho direito de recusar o uso de IA (caso não aceite, a consulta pode ser realizada sem recursos de IA)</li>
                    <li>Fui informado(a) sobre os riscos e benefícios</li>
                    <li>Dou meu consentimento livre e esclarecido para o uso de IA nesta consulta</li>
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Data de emissão:</strong> {new Date().toLocaleDateString('pt-BR')}
                    <br />
                    <strong>Versão:</strong> 1.0
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="read-terms"
                checked={readTerms}
                onCheckedChange={(checked) => setReadTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="read-terms" className="text-sm leading-relaxed cursor-pointer">
                Declaro que <strong>li completamente</strong> e <strong>compreendi</strong> todos os termos 
                e condições descritos acima sobre o uso de Inteligência Artificial nesta consulta.
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-terms"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
                disabled={!readTerms}
                className="mt-1"
              />
              <Label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
                <strong>{nameLabel}</strong>, eu <strong>aceito e consentimento</strong> o uso de tecnologias 
                de Inteligência Artificial (ChatGPT/OpenAI) conforme descrito neste termo, para transcrição 
                e geração de resumo médico desta consulta de telemedicina.
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {onDecline && (
              <Button variant="outline" onClick={onDecline} disabled={!accepted && readTerms}>
                Não Aceito
              </Button>
            )}
            <Button 
              onClick={onAccept} 
              disabled={!accepted || !readTerms}
              size="lg"
              className="min-w-[200px]"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aceitar e Continuar
            </Button>
          </div>

          {(!readTerms || !accepted) && (
            <Alert variant="default" className="bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Por favor, leia e aceite todos os termos para continuar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

