'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { getAdmins, registerAdmin, updateAdmin, disableAdmin, assignRoles, type Admin, type RegisterAdminDto, type UpdateAdminDto } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { getUser } from '@/lib/user'

const AVAILABLE_ROLES = [
    'Manager',
    'InstallationAdmin',
    'MaintenanceAdmin',
    'InventoryAdmin',
    'FinanceAdmin',
    'FaultsAdmin'
]

export function AdminManagement() {
    const [admins, setAdmins] = useState<Admin[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
    const [formData, setFormData] = useState<RegisterAdminDto>({
        name: '',
        email: '',
        phone: '',
        password: '',
        roles: []
    })
    const [editFormData, setEditFormData] = useState<UpdateAdminDto & { roles: string[] }>({
        name: '',
        email: '',
        phone: '',
        password: '',
        roles: []
    })
    const { toast } = useToast()
    const currentUser = getUser()

    const loadAdmins = async () => {
        try {
            setLoading(true)
            const data = await getAdmins()
            setAdmins(data)
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load admins',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAdmins()
    }, [])

    const handleCreate = async () => {
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive'
            })
            return
        }

        if (formData.roles.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'Please select at least one role',
                variant: 'destructive'
            })
            return
        }

        try {
            await registerAdmin(formData)
            toast({
                title: 'Success',
                description: 'Admin created successfully'
            })
            setIsCreateDialogOpen(false)
            setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                roles: []
            })
            loadAdmins()
        } catch (error: any) {
            // Extract all error messages from the backend response
            let errorMessage = error.message || 'Failed to create admin'
            let errorTitle = 'Error'
            
            // Check if error has data with errors array (handle both camelCase and PascalCase)
            const errorData = error.data || {}
            const errors = errorData.errors || errorData.Errors || []
            const message = errorData.message || errorData.Message
            
            if (Array.isArray(errors) && errors.length > 0) {
                errorTitle = message || 'Validation Error'
                // Format errors as a bulleted list for better readability
                errorMessage = errors.map((err: string) => `• ${err}`).join('\n')
            } else if (message) {
                errorTitle = 'Error'
                errorMessage = message
            }
            
            toast({
                title: errorTitle,
                description: errorMessage,
                variant: 'destructive'
            })
        }
    }

    const handleEdit = (admin: Admin) => {
        setSelectedAdmin(admin)
        setEditFormData({
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            password: '',
            roles: [...admin.roles]
        })
        setIsEditDialogOpen(true)
    }

    const handleUpdate = async () => {
        if (!selectedAdmin) return

        if (!editFormData.name || !editFormData.email || !editFormData.phone) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive'
            })
            return
        }

        try {
            const updateData: UpdateAdminDto = {
                name: editFormData.name,
                email: editFormData.email,
                phone: editFormData.phone
            }

            // Only include password if it's provided
            if (editFormData.password && editFormData.password.trim() !== '') {
                updateData.password = editFormData.password
            }

            await updateAdmin(selectedAdmin.id, updateData)

            // Update roles separately if they changed
            const rolesChanged = JSON.stringify(editFormData.roles.sort()) !== JSON.stringify(selectedAdmin.roles.sort())
            if (rolesChanged) {
                await assignRoles(selectedAdmin.id, editFormData.roles)
            }

            toast({
                title: 'Success',
                description: 'Admin updated successfully'
            })
            setIsEditDialogOpen(false)
            setSelectedAdmin(null)
            loadAdmins()
        } catch (error: any) {
            // Extract all error messages from the backend response
            let errorMessage = error.message || 'Failed to update admin'
            let errorTitle = 'Error'
            
            // Check if error has data with errors array (handle both camelCase and PascalCase)
            const errorData = error.data || {}
            const errors = errorData.errors || errorData.Errors || []
            const message = errorData.message || errorData.Message
            
            if (Array.isArray(errors) && errors.length > 0) {
                errorTitle = message || 'Validation Error'
                // Format errors as a bulleted list for better readability
                errorMessage = errors.map((err: string) => `• ${err}`).join('\n')
            } else if (message) {
                errorTitle = 'Error'
                errorMessage = message
            }
            
            toast({
                title: errorTitle,
                description: errorMessage,
                variant: 'destructive'
            })
        }
    }

    const handleToggleDisable = async (admin: Admin) => {
        if (currentUser?.email === admin.email) {
            toast({
                title: 'Error',
                description: 'You cannot disable your own account',
                variant: 'destructive'
            })
            return
        }

        try {
            await disableAdmin(admin.id, !admin.isDisabled)
            toast({
                title: 'Success',
                description: `Admin ${admin.isDisabled ? 'enabled' : 'disabled'} successfully`
            })
            loadAdmins()
        } catch (error: any) {
            // Extract all error messages from the backend response
            let errorMessage = error.message || 'Failed to update admin status'
            let errorTitle = 'Error'
            
            // Check if error has data with errors array (handle both camelCase and PascalCase)
            const errorData = error.data || {}
            const errors = errorData.errors || errorData.Errors || []
            const message = errorData.message || errorData.Message
            
            if (Array.isArray(errors) && errors.length > 0) {
                errorTitle = message || 'Error'
                // Format errors as a bulleted list for better readability
                errorMessage = errors.map((err: string) => `• ${err}`).join('\n')
            } else if (message) {
                errorMessage = message
            }
            
            toast({
                title: errorTitle,
                description: errorMessage,
                variant: 'destructive'
            })
        }
    }

    const toggleRole = (role: string, isCreate: boolean = true) => {
        if (isCreate) {
            setFormData(prev => ({
                ...prev,
                roles: prev.roles.includes(role)
                    ? prev.roles.filter(r => r !== role)
                    : [...prev.roles, role]
            }))
        } else {
            setEditFormData(prev => ({
                ...prev,
                roles: prev.roles.includes(role)
                    ? prev.roles.filter(r => r !== role)
                    : [...prev.roles, role]
            }))
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never'
        try {
            return new Date(dateString).toLocaleString()
        } catch {
            return 'Invalid date'
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Admin Management</CardTitle>
                        <CardDescription>Manage system administrators and their roles</CardDescription>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Admin
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No admins found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                admins.map((admin) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium">{admin.name}</TableCell>
                                        <TableCell>{admin.email}</TableCell>
                                        <TableCell>{admin.phone}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {admin.roles.map((role) => (
                                                    <Badge key={role} variant="secondary">
                                                        {role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(admin.lastLogin)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={!admin.isDisabled}
                                                    onCheckedChange={() => handleToggleDisable(admin)}
                                                    disabled={currentUser?.email === admin.email}
                                                />
                                                <span className="text-sm">
                                                    {admin.isDisabled ? 'Disabled' : 'Active'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(admin)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Admin</DialogTitle>
                        <DialogDescription>Add a new administrator to the system</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-name">Name *</Label>
                            <Input
                                id="create-name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Full name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-email">Email *</Label>
                            <Input
                                id="create-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-phone">Phone *</Label>
                            <Input
                                id="create-phone"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-password">Password *</Label>
                            <Input
                                id="create-password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="Enter password"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Roles *</Label>
                            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                                {AVAILABLE_ROLES.map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`create-role-${role}`}
                                            checked={formData.roles.includes(role)}
                                            onCheckedChange={() => toggleRole(role, true)}
                                        />
                                        <Label
                                            htmlFor={`create-role-${role}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {role}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate}>Create Admin</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Admin</DialogTitle>
                        <DialogDescription>Update administrator information and roles</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name *</Label>
                            <Input
                                id="edit-name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Full name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email *</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-phone">Phone *</Label>
                            <Input
                                id="edit-phone"
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editFormData.password}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="Enter new password (optional)"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Roles *</Label>
                            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                                {AVAILABLE_ROLES.map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`edit-role-${role}`}
                                            checked={editFormData.roles.includes(role)}
                                            onCheckedChange={() => toggleRole(role, false)}
                                        />
                                        <Label
                                            htmlFor={`edit-role-${role}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {role}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate}>Update Admin</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

