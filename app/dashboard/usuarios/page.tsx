'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserCog,
  Mail,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type UserRole = 'admin' | 'medico' | 'enfermeiro' | 'recepcionista' | 'paciente' | 'desenvolvedor'

interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'paciente' as UserRole,
  })

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: 'Acesso negado',
            description: 'Apenas administradores podem acessar esta página.',
            variant: 'destructive',
          })
        }
        throw new Error('Erro ao carregar usuários')
      }

      const { users: usersData } = await response.json()
      setUsers(usersData || [])
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      if (!formData.name || !formData.email || !formData.password) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Erro ao criar usuário')
      }

      toast({
        title: 'Usuário criado!',
        description: 'O usuário foi criado com sucesso.',
      })

      setCreateDialogOpen(false)
      setFormData({ name: '', email: '', password: '', role: 'paciente' })
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      toast({
        title: 'Erro ao criar usuário',
        description: error.message || 'Não foi possível criar o usuário.',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Erro ao atualizar usuário')
      }

      toast({
        title: 'Usuário atualizado!',
        description: 'As informações do usuário foram atualizadas.',
      })

      setEditDialogOpen(false)
      setSelectedUser(null)
      setFormData({ name: '', email: '', password: '', role: 'paciente' })
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error)
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message || 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Erro ao excluir usuário')
      }

      toast({
        title: 'Usuário excluído!',
        description: 'O usuário foi excluído com sucesso.',
      })

      setDeleteDialogOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error)
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message || 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      })
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return

    try {
      const newPassword = formData.password || generateRandomPassword()

      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
        credentials: 'include',
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Erro ao redefinir senha')
      }

      const { password: returnedPassword } = await response.json()

      toast({
        title: 'Senha redefinida!',
        description: `A nova senha é: ${returnedPassword || newPassword}. Compartilhe com o usuário.`,
      })

      setResetPasswordDialogOpen(false)
      setSelectedUser(null)
      setFormData({ name: '', email: '', password: '', role: 'paciente' })
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error)
      toast({
        title: 'Erro ao redefinir senha',
        description: error.message || 'Não foi possível redefinir a senha.',
        variant: 'destructive',
      })
    }
  }

  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase()
  }

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    })
    setEditDialogOpen(true)
  }

  const openResetPasswordDialog = (user: UserProfile) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: generateRandomPassword(),
      role: user.role,
    })
    setResetPasswordDialogOpen(true)
  }

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      admin: { label: 'Administrador', variant: 'destructive' },
      medico: { label: 'Médico', variant: 'default' },
      enfermeiro: { label: 'Enfermeiro', variant: 'secondary' },
      recepcionista: { label: 'Secretária', variant: 'outline' },
      desenvolvedor: { label: 'Desenvolvedor', variant: 'default' },
      paciente: { label: 'Paciente', variant: 'secondary' },
    }
    return variants[role] || { label: role, variant: 'secondary' }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'medico':
        return <UserCheck className="h-4 w-4" />
      case 'enfermeiro':
        return <UserCog className="h-4 w-4" />
      case 'recepcionista':
        return <UserCog className="h-4 w-4" />
      case 'desenvolvedor':
        return <Shield className="h-4 w-4 text-purple-500" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando usuários...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, roles e permissões do sistema
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {users.filter((u) => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Médicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter((u) => u.role === 'medico').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Secretárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.role === 'recepcionista').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Desenvolvedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {users.filter((u) => u.role === 'desenvolvedor').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {users.filter((u) => u.role === 'paciente').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="enfermeiro">Enfermeiro</SelectItem>
                <SelectItem value="recepcionista">Secretária</SelectItem>
                <SelectItem value="desenvolvedor">Desenvolvedor</SelectItem>
                <SelectItem value="paciente">Paciente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role)
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold">{user.name}</p>
                        <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criado em {format(new Date(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResetPasswordDialog(user)}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Redefinir Senha
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Criar Usuário */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário no sistema e defina sua role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Senha temporária"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                className="w-full"
              >
                Gerar Senha Aleatória
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="enfermeiro">Enfermeiro</SelectItem>
                  <SelectItem value="recepcionista">Secretária</SelectItem>
                  <SelectItem value="desenvolvedor">Desenvolvedor</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>Criar Usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="enfermeiro">Enfermeiro</SelectItem>
                  <SelectItem value="recepcionista">Secretária</SelectItem>
                  <SelectItem value="desenvolvedor">Desenvolvedor</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Redefinir Senha */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nova Senha *</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nova senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                className="w-full"
              >
                Gerar Senha Aleatória
              </Button>
            </div>
            {formData.password && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Nova senha:</strong> {formData.password}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Compartilhe esta senha com o usuário de forma segura.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword}>Redefinir Senha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.name}</strong>?
              Esta ação não pode ser desfeita e todos os dados associados serão removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Excluir Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

