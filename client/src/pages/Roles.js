import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  fetchRoles, 
  createRole, 
  updateRole, 
  deleteRole,
  fetchRoleUsers
} from '../store/slices/roleSlice';
import { loadUser } from '../store/slices/authSlice';
import { toast } from 'react-hot-toast';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  X
} from 'lucide-react';
import { isAdmin, hasPermission } from '../utils/permissions';

const Roles = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { roles, loading, error, roleUsers } = useSelector((state) => state.roles);
  const { user } = useSelector((state) => state.auth);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: getDefaultPermissions()
  });

  useEffect(() => {
    if (!user) {
      dispatch(loadUser());
    }
    
    // Check if user has permission to view roles
    if (user && !hasPermission(user, 'roles.view') && !isAdmin(user)) {
      toast.error('Access denied: Insufficient permissions');
      navigate('/dashboard');
      return;
    }

    dispatch(fetchRoles());
  }, [dispatch, user, navigate]);

  function getDefaultPermissions() {
    return {
      cards: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        viewAll: false,
        editAll: false,
        deleteAll: false
      },
      collections: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        viewAll: false,
        editAll: false,
        deleteAll: false
      },
      users: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        assignRoles: false
      },
      roles: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      system: {
        viewSettings: false,
        editSettings: false,
        viewLogs: false
      },
      upload: {
        upload: true,
        uploadMultiple: true,
        viewAll: false
      }
    };
  }

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      permissions: getDefaultPermissions()
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      permissions: role.permissions || getDefaultPermissions()
    });
    setShowEditModal(true);
  };

  const handleOpenUsers = async (role) => {
    setSelectedRole(role);
    await dispatch(fetchRoleUsers(role._id));
    setShowUsersModal(true);
  };

  const handlePermissionChange = (path, value) => {
    const parts = path.split('.');
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      let current = newPermissions;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = { ...current[parts[i]] };
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.displayName) {
      toast.error('Name and display name are required');
      return;
    }

    try {
      await dispatch(createRole(formData)).unwrap();
      toast.success('Role created successfully');
      setShowCreateModal(false);
      dispatch(fetchRoles());
    } catch (error) {
      toast.error(error || 'Failed to create role');
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;

    try {
      await dispatch(updateRole({ 
        roleId: selectedRole._id, 
        roleData: formData 
      })).unwrap();
      toast.success('Role updated successfully');
      setShowEditModal(false);
      setSelectedRole(null);
      dispatch(fetchRoles());
    } catch (error) {
      toast.error(error || 'Failed to update role');
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Are you sure you want to delete the role "${role.displayName}"?`)) {
      return;
    }

    try {
      await dispatch(deleteRole(role._id)).unwrap();
      toast.success('Role deleted successfully');
      dispatch(fetchRoles());
    } catch (error) {
      toast.error(error || 'Failed to delete role');
    }
  };

  const renderPermissionSection = (sectionName, sectionPermissions) => {
    return (
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold text-sm mb-2 capitalize">{sectionName}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(sectionPermissions).map(([key, value]) => (
            <label key={key} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => handlePermissionChange(`${sectionName}.${key}`, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-gray-700 dark:text-gray-300 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (!user || (!hasPermission(user, 'roles.view') && !isAdmin(user))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pt-16 sm:pt-4 pb-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Role Management
          </h1>
          {hasPermission(user, 'roles.create') && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Role</span>
            </button>
          )}
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage user roles and permissions
        </p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {roles.map((role) => (
                  <tr key={role._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {role.displayName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {role.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {role.description ? (
                          <div className="whitespace-normal break-words max-w-lg">
                            {role.description}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        role.isSystem 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {role.isSystem ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        role.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenUsers(role)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Users"
                        >
                          <Users className="h-5 w-5" />
                        </button>
                        {hasPermission(user, 'roles.edit') && role.name !== 'superadmin' && (
                          <button
                            onClick={() => handleOpenEdit(role)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title="Edit Role"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        )}
                        {hasPermission(user, 'roles.delete') && !role.isSystem && role.name !== 'superadmin' && (
                          <button
                            onClick={() => handleDelete(role)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Role"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                        {role.name === 'superadmin' && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic" title="Superadmin role cannot be modified">
                            Immutable
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Role</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., editor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Editor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows="3"
                    placeholder="Role description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Permissions
                  </label>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Object.entries(formData.permissions).map(([section, sectionPerms]) => (
                      <div key={section}>
                        {renderPermissionSection(section, sectionPerms)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Create Role
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Role</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRole(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    disabled={selectedRole.isSystem}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                  {selectedRole.name === 'superadmin' && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">Superadmin role is immutable and cannot be modified</p>
                  )}
                  {selectedRole.isSystem && selectedRole.name !== 'superadmin' && (
                    <p className="text-xs text-gray-500 mt-1">System roles cannot be renamed</p>
                  )}
                </div>

                {selectedRole.name === 'superadmin' && (
                  <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Shield className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Superadmin Role is Immutable
                        </h3>
                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                          <p>This role cannot be modified, deleted, or deactivated. It provides full system access.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    disabled={selectedRole.name === 'superadmin'}
                    className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                      selectedRole.name === 'superadmin' 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={selectedRole.name === 'superadmin'}
                    className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                      selectedRole.name === 'superadmin' 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Permissions
                  </label>
                  {selectedRole.name === 'superadmin' ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Superadmin has all permissions enabled and cannot be modified.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {Object.entries(formData.permissions).map(([section, sectionPerms]) => (
                        <div key={section}>
                          {renderPermissionSection(section, sectionPerms)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedRole(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  {selectedRole.name !== 'superadmin' && (
                    <button
                      onClick={handleUpdate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Users Modal */}
      {showUsersModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Users with {selectedRole.displayName} Role
                </h2>
                <button
                  onClick={() => {
                    setShowUsersModal(false);
                    setSelectedRole(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-2">
                {roleUsers && roleUsers[selectedRole._id] && roleUsers[selectedRole._id].length > 0 ? (
                  roleUsers[selectedRole._id].map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No users have this role assigned
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
