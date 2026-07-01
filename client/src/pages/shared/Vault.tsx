import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileCode,
  FileSpreadsheet,
  File,
  Plus,
  Upload,
  Trash2,
  Download,
  Search,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader,
  X,
  Eye
} from 'lucide-react';
import {
  fetchVaultFolders,
  createVaultFolder,
  fetchVaultFiles,
  uploadVaultFile,
  deleteVaultFile,
  fetchReviewById
} from '../../utils/api';

interface VaultProps {
  user: any;
}

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape"
];

export default function Vault({ user }: VaultProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [currentSubfolder, setCurrentSubfolder] = useState<string>(''); // virtual folder navigation inside incident
  const [previewFile, setPreviewFile] = useState<any | null>(null); // quick media preview lightbox
  const [files, setFiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [protectedFileNames, setProtectedFileNames] = useState<string[]>([]);

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');

  // Expand state for provinces in the tree
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({});

  const isSupervisor = user?.assignedRole === 'supervisor';
  const isAdmin = user?.assignedRole === 'admin' || user?.assignedRole === 'sys-admin';
  const userProvince = user?.province || 'Gauteng';

  // Determine which provinces the user is allowed to see
  const visibleProvinces = isSupervisor
    ? PROVINCES.filter(p => p.toLowerCase() === userProvince.toLowerCase())
    : PROVINCES;

  useEffect(() => {
    // Initial selected province
    if (visibleProvinces.length > 0) {
      const initial = visibleProvinces[0];
      setSelectedProvince(initial);
      setExpandedProvinces({ [initial]: true });
    }
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      setSelectedFolder(null);
      setCurrentSubfolder('');
      setPreviewFile(null);
      setFiles([]);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedFolder) {
      setCurrentSubfolder('');
      setPreviewFile(null);
      setProtectedFileNames([]);
      loadFiles(selectedFolder.province, selectedFolder.incidentNumber);

      // Fetch review details to find and protect all documents that were uploaded as part of the review extraction
      fetchReviewById(selectedFolder.incidentNumber)
        .then(review => {
          if (review && review.documents) {
            const protectedNames = review.documents
              .filter((d: any) => d.url && d.url.trim() !== '')
              .map((d: any) => d.name.toLowerCase());
            setProtectedFileNames(protectedNames);
          }
        })
        .catch(err => {
          console.warn("Could not fetch review details for Vault folder.", err);
        });
    } else {
      setFiles([]);
      setCurrentSubfolder('');
      setPreviewFile(null);
      setProtectedFileNames([]);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchVaultFolders();
      setFolders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (province: string, incident: string) => {
    setFilesLoading(true);
    setError('');
    try {
      const data = await fetchVaultFiles(province, incident);
      setFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load files from Azure Blob');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubfolderName.trim() || !selectedFolder) return;

    setError('');
    setSuccess('');
    setFilesLoading(true);
    try {
      const cleanFolderName = newSubfolderName.trim().replace(/\//g, '');
      const placeholderName = `${cleanFolderName}/`;

      // Check if folder already exists
      const folderExists = files.some(f => f.name.startsWith(cleanFolderName + '/'));
      if (folderExists) {
        throw new Error('A folder or file with this name already exists.');
      }

      // Upload a 0-byte dummy file as an empty folder placeholder
      await uploadVaultFile(selectedFolder.province, selectedFolder.incidentNumber, {
        fileName: placeholderName,
        fileType: 'application/octet-stream',
        fileBase64: 'data:application/octet-stream;base64,'
      });

      setSuccess(`Subfolder '${cleanFolderName}' created successfully.`);
      setNewSubfolderName('');
      setShowNewFolderModal(false);
      await loadFiles(selectedFolder.province, selectedFolder.incidentNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to create subfolder');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;

    setError('');
    setSuccess('');
    setFilesLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Content = reader.result as string;
        // Prepend currentSubfolder if inside one
        const targetFileName = currentSubfolder
          ? `${currentSubfolder}/${file.name}`
          : file.name;

        await uploadVaultFile(selectedFolder.province, selectedFolder.incidentNumber, {
          fileName: targetFileName,
          fileType: file.type,
          fileBase64: base64Content
        });
        setSuccess(`File '${file.name}' uploaded successfully to '${currentSubfolder || 'root'}'.`);
        await loadFiles(selectedFolder.province, selectedFolder.incidentNumber);
      } catch (err: any) {
        setError(err.message || 'Failed to upload file');
      } finally {
        setFilesLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file contents');
      setFilesLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!selectedFolder) return;
    if (!window.confirm(`Are you sure you want to permanently delete file '${fileName.split('/').pop()}' from Azure Storage?`)) return;

    setError('');
    setSuccess('');
    setFilesLoading(true);
    try {
      await deleteVaultFile(selectedFolder.province, selectedFolder.incidentNumber, fileName);
      setSuccess(`File deleted successfully.`);
      await loadFiles(selectedFolder.province, selectedFolder.incidentNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
      setFilesLoading(false);
    }
  };

  const handleDeleteSubfolder = async (folderName: string) => {
    if (!selectedFolder) return;
    if (!window.confirm(`Are you sure you want to permanently delete subfolder '${folderName}' and all its contents from Azure Storage?`)) return;

    setError('');
    setSuccess('');
    setFilesLoading(true);
    try {
      const prefix = folderName + '/';
      const filesToDelete = files.filter(f => f.name.startsWith(prefix));

      // Delete files recursively
      for (const f of filesToDelete) {
        await deleteVaultFile(selectedFolder.province, selectedFolder.incidentNumber, f.name);
      }

      setSuccess(`Subfolder '${folderName}' and its contents deleted successfully.`);
      await loadFiles(selectedFolder.province, selectedFolder.incidentNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to delete subfolder');
      setFilesLoading(false);
    }
  };

  const toggleProvinceExpand = (prov: string) => {
    setExpandedProvinces(prev => ({
      ...prev,
      [prov]: !prev[prov]
    }));
    setSelectedProvince(prov);
  };

  // Helper to format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Get file icon based on type/extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText size={36} style={{ color: '#ef4444' }} />;
      case 'doc':
      case 'docx':
        return <FileText size={36} style={{ color: '#3b82f6' }} />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet size={36} style={{ color: '#10b981' }} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <FileImage size={36} style={{ color: '#a855f7' }} />;
      case 'txt':
      case 'json':
        return <FileCode size={36} style={{ color: '#6b7280' }} />;
      default:
        return <File size={36} style={{ color: '#94a3b8' }} />;
    }
  };

  // Filter folders/files by search query
  const filteredFolders = folders.filter(f =>
    f.province.toLowerCase() === selectedProvince.toLowerCase() &&
    f.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group files by current level (virtual subdirectories)
  const getVirtualItems = () => {
    const subfoldersSet = new Set<string>();
    const filesInCurrentDir: any[] = [];

    files.forEach(f => {
      const name = f.name;

      if (currentSubfolder === '') {
        // Root of incident folder
        const parts = name.split('/');
        if (parts.length > 1) {
          subfoldersSet.add(parts[0]);
        } else {
          // It's a file in the root (ignore empty folder placeholders in the root if they somehow exist)
          if (name !== '' && !name.endsWith('/')) {
            filesInCurrentDir.push(f);
          }
        }
      } else {
        // Inside a virtual subfolder (e.g. "Photos")
        const prefix = currentSubfolder + '/';
        if (name.startsWith(prefix) && name !== prefix) {
          const relativeName = name.substring(prefix.length);
          const parts = relativeName.split('/');
          if (parts.length === 1) {
            // Direct child file
            filesInCurrentDir.push({
              ...f,
              displayName: relativeName
            });
          }
        }
      }
    });

    // Apply search filter
    const searchedSubfolders = Array.from(subfoldersSet).filter(folder =>
      folder.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const searchedFiles = filesInCurrentDir.filter(file =>
      (file.displayName || file.name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      subfolders: searchedSubfolders,
      filesList: searchedFiles
    };
  };

  const { subfolders, filesList } = getVirtualItems();

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', width: '100%' }}>
      {/* Feedback Notifications */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2',
          border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px',
          color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {success && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#dcfce7',
          border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '8px',
          color: '#15803d', fontSize: '0.875rem', marginBottom: '1rem'
        }}>
          <FolderOpen size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#15803d', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

        {/* Left Side: Directory Tree */}
        <aside style={{ width: '280px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', flexShrink: 0 }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <FolderOpen size={18} />
            <span>Vault Provinces</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
            <ul style={{ listStyle: 'none' }}>
              {visibleProvinces.map(prov => {
                const isExpanded = !!expandedProvinces[prov];
                const isSelected = selectedProvince === prov;
                const provFolders = folders.filter(f => f.province.toLowerCase() === prov.toLowerCase());

                return (
                  <li key={prov} style={{ marginBottom: '0.25rem' }}>
                    <div
                      onClick={() => toggleProvinceExpand(prov)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '0.5rem 0.75rem',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem',
                        fontWeight: isSelected ? 600 : 500,
                        backgroundColor: isSelected ? 'rgba(14, 77, 65, 0.08)' : 'transparent',
                        color: isSelected ? 'var(--color-primary)' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                      className="tree-node"
                    >
                      <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginRight: '0.25rem', color: '#64748b' }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <Folder size={16} style={{ marginRight: '0.5rem', color: isSelected ? 'var(--color-primary)' : '#83a39d' }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prov} Vault</span>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '10px', marginLeft: '0.5rem' }}>
                        {provFolders.length}
                      </span>
                    </div>

                    {isExpanded && (
                      <ul style={{ listStyle: 'none', paddingLeft: '2rem', marginTop: '0.25rem' }}>
                        {provFolders.length === 0 ? (
                          <li style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No incidents
                          </li>
                        ) : (
                          provFolders.map(folder => {
                            const isFolderSelected = selectedFolder?.id === folder.id;
                            return (
                              <li key={folder.id} style={{ marginBottom: '0.15rem' }}>
                                <div
                                  onClick={() => setSelectedFolder(folder)}
                                  style={{
                                    display: 'flex', alignItems: 'center', padding: '0.35rem 0.6rem',
                                    borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
                                    fontWeight: isFolderSelected ? 600 : 400,
                                    backgroundColor: isFolderSelected ? 'var(--color-accent)' : 'transparent',
                                    color: isFolderSelected ? '#0e4d41' : '#64748b',
                                  }}
                                  className="tree-folder"
                                >
                                  <Folder size={14} style={{ marginRight: '0.35rem', flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {folder.incidentNumber}
                                  </span>
                                </div>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Right Side: File Explorer Details */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Right Header: Breadcrumbs & Search & Actions */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => { setSelectedFolder(null); }}>Vaults</span>
              <ChevronRight size={14} />
              <span style={{ cursor: 'pointer', color: selectedFolder ? '#64748b' : 'var(--color-primary)', fontWeight: selectedFolder ? 400 : 600 }} onClick={() => setSelectedFolder(null)}>{selectedProvince}</span>
              {selectedFolder && (
                <>
                  <ChevronRight size={14} />
                  <span style={{ cursor: 'pointer', color: currentSubfolder ? '#64748b' : 'var(--color-primary)', fontWeight: currentSubfolder ? 400 : 600 }} onClick={() => setCurrentSubfolder('')}>{selectedFolder.incidentNumber}</span>
                </>
              )}
              {currentSubfolder && (
                <>
                  <ChevronRight size={14} />
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{currentSubfolder}</span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder={selectedFolder ? "Search files..." : "Search incidents..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.8125rem',
                    borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              {/* Actions: Show New Folder ONLY inside a selected Incident and when in root directory (Level 1 limit) */}
              {selectedFolder && currentSubfolder === '' && (
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem',
                    fontSize: '0.8125rem', border: '1px solid var(--color-primary)', borderRadius: '8px',
                    color: 'var(--color-primary)', backgroundColor: 'transparent', cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Plus size={16} />
                  <span>New Folder</span>
                </button>
              )}

              {/* Upload File enabled inside any Incident folder level */}
              {selectedFolder && (
                <label
                  className="btn btn-primary"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem',
                    fontSize: '0.8125rem', border: 'none', borderRadius: '8px',
                    color: 'white', backgroundColor: 'var(--color-primary)', cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Upload size={16} />
                  <span>Upload File</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Right Main Panel Body */}
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', position: 'relative' }}>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#64748b' }}>
                <Loader className="spin" size={32} />
                <span>Loading folders...</span>
              </div>
            ) : filesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#64748b' }}>
                <Loader className="spin" size={32} />
                <span>Syncing with Azure Storage...</span>
              </div>
            ) : !selectedFolder ? (

              /* INCIDENTS LIST VIEW (Province root - NO MANUAL CREATION ALLOWED HERE) */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                    Folders inside {selectedProvince} Vault
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Showing {filteredFolders.length} incidents
                  </span>
                </div>

                {filteredFolders.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '4rem 2rem', border: '2px dashed #e2e8f0', borderRadius: '12px',
                    textAlign: 'center', color: '#64748b'
                  }}>
                    <FolderOpen size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                    <h4 style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>No incident vaults created</h4>
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', maxWidth: '320px', margin: 0 }}>
                      Incident tracking folders are automatically generated once an invoice is uploaded from the Invoice Management screen.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {filteredFolders.map(folder => (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolder(folder)}
                        style={{
                          border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem',
                          backgroundColor: 'white', display: 'flex', flexDirection: 'column',
                          cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
                        }}
                        className="folder-card"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Folder size={32} style={{ color: '#d8c14c' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={folder.incidentNumber}>
                              {folder.incidentNumber}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                              Created {new Date(folder.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {folder.description && (
                          <p style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '34px', margin: 0 }}>
                            {folder.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', fontSize: '0.7rem', color: '#94a3b8' }}>
                          <span>By: {folder.createdBy}</span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Open →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (

              /* FILE AND SUBFOLDERS DISPLAY (Inside specific tracking ID folder) */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  {currentSubfolder !== '' ? (
                    <button
                      onClick={() => setCurrentSubfolder('')}
                      style={{
                        background: 'none', border: '1px solid #cbd5e1', padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem', borderRadius: '6px', color: '#64748b', cursor: 'pointer',
                        fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}
                    >
                      ← Back to root
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedFolder(null)}
                      style={{
                        background: 'none', border: '1px solid #cbd5e1', padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem', borderRadius: '6px', color: '#64748b', cursor: 'pointer',
                        fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}
                    >
                      ← Back to incidents
                    </button>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FolderOpen size={20} style={{ color: '#d8c14c' }} />
                      <span>{selectedFolder.incidentNumber} {currentSubfolder && `/ ${currentSubfolder}`}</span>
                    </h3>
                    {selectedFolder.description && !currentSubfolder && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedFolder.description}</span>
                    )}
                  </div>
                </div>

                {subfolders.length === 0 && filesList.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '5rem 2rem', border: '2px dashed #e2e8f0', borderRadius: '12px',
                    textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc'
                  }}>
                    <Upload size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                    <h4 style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Folder is empty</h4>
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', maxWidth: '320px', marginBottom: '1.25rem' }}>
                      Add a new subfolder or upload files directly to organize media.
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {currentSubfolder === '' && (
                        <button
                          onClick={() => setShowNewFolderModal(true)}
                          style={{
                            padding: '0.5rem 1rem', fontSize: '0.8125rem', border: '1px solid var(--color-primary)',
                            borderRadius: '6px', color: 'var(--color-primary)', backgroundColor: 'transparent',
                            cursor: 'pointer', fontWeight: 600
                          }}
                        >
                          Create Subfolder
                        </button>
                      )}

                      <label
                        style={{
                          padding: '0.5rem 1rem', fontSize: '0.8125rem', border: 'none', borderRadius: '6px',
                          color: 'white', backgroundColor: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                        }}
                      >
                        <Plus size={16} />
                        <span>Upload File</span>
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Render subfolders first (if at root) */}
                    {currentSubfolder === '' && subfolders.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, marginBottom: '0.75rem' }}>Folders</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                          {subfolders.map(sub => (
                            <div
                              key={sub}
                              onClick={() => setCurrentSubfolder(sub)}
                              style={{
                                border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem',
                                backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center',
                                cursor: 'pointer', transition: 'all 0.15s ease', position: 'relative'
                              }}
                              className="folder-card"
                            >
                              <Folder size={20} style={{ color: '#cbd5e1', marginRight: '0.5rem' }} />
                              <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {sub}
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubfolder(sub);
                                }}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#ef4444', opacity: 0.7, padding: '0.25rem'
                                }}
                                title="Delete subfolder"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render files list */}
                    {filesList.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, marginBottom: '0.75rem' }}>Files</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                          {filesList.map((file, idx) => (
                            <div
                              key={idx}
                              style={{
                                border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem',
                                backgroundColor: 'white', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', textAlign: 'center', position: 'relative',
                                boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s ease'
                              }}
                              className="file-card"
                            >
                              <div style={{ marginBottom: '0.75rem' }}>
                                {getFileIcon(file.name)}
                              </div>
                              <div style={{
                                fontWeight: 500, color: '#0f172a', fontSize: '0.8125rem',
                                width: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', marginBottom: '0.25rem'
                              }} title={file.displayName || file.name}>
                                {file.displayName || file.name}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '1rem' }}>
                                {formatBytes(file.size)}
                              </div>

                              <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #f1f5f9', marginTop: 'auto', paddingTop: '0.5rem', justifyContent: 'space-around' }}>
                                <button
                                  onClick={() => setPreviewFile(file)}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    backgroundColor: '#f1f5f9', color: 'var(--color-primary)',
                                    border: 'none', cursor: 'pointer', transition: 'all 0.15s ease'
                                  }}
                                  title="Quick Preview"
                                >
                                  <Eye size={14} />
                                </button>

                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    backgroundColor: '#f1f5f9', color: 'var(--color-primary)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Download / Open"
                                >
                                  <Download size={14} />
                                </a>

                                {(isAdmin || !protectedFileNames.includes((file.displayName || file.name.split('/').pop() || '').toLowerCase())) && (
                                  <button
                                    onClick={() => handleDeleteFile(file.name)}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      width: '32px', height: '32px', borderRadius: '50%',
                                      backgroundColor: '#fee2e2', color: '#dc2626', border: 'none',
                                      cursor: 'pointer', transition: 'all 0.15s ease'
                                    }}
                                    title="Delete file"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* New Subfolder Modal (for Level 1 creation inside an Incident) */}
      {showNewFolderModal && selectedFolder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', width: '400px',
            maxWidth: '90%', boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: 'var(--color-primary-light)'
            }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 700, margin: 0 }}>
                Create Subfolder
              </h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubfolder} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  Creating a new subfolder in <strong>{selectedFolder.incidentNumber}</strong>.
                </span>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Site Photos"
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  required
                  autoFocus
                  style={{ fontSize: '0.875rem', padding: '0.625rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  style={{
                    padding: '0.5rem 1rem', fontSize: '0.875rem', border: '1px solid #cbd5e1',
                    borderRadius: '6px', color: '#475569', backgroundColor: 'transparent',
                    cursor: 'pointer', fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.25rem', fontSize: '0.875rem', border: 'none',
                    borderRadius: '6px', color: 'white', backgroundColor: 'var(--color-primary)',
                    cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {previewFile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '2rem'
        }} onClick={() => setPreviewFile(null)}>
          <div
            style={{
              backgroundColor: 'white', borderRadius: '12px', width: '900px',
              maxWidth: '95%', maxHeight: '90vh', boxShadow: 'var(--shadow-2xl)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewFile.displayName || previewFile.name.split('/').pop()}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Size: {formatBytes(previewFile.size)}
                </span>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', borderRadius: '50%' }}
                className="hover-bg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Viewer */}
            <div style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', minHeight: '300px', overflowY: 'auto' }}>
              {(() => {
                const ext = previewFile.name.split('.').pop()?.toLowerCase();
                const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
                const isPdf = ext === 'pdf';
                const isVideo = ['mp4', 'webm', 'ogg'].includes(ext || '');
                const isAudio = ['mp3', 'wav', 'ogg'].includes(ext || '');

                if (isImage) {
                  return (
                    <img
                      src={previewFile.url}
                      alt={previewFile.name}
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={previewFile.url}
                      title={previewFile.name}
                      style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                    />
                  );
                }

                if (isVideo) {
                  return (
                    <video
                      src={previewFile.url}
                      controls
                      autoPlay
                      style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }}
                    />
                  );
                }

                if (isAudio) {
                  return (
                    <div style={{ width: '100%', maxWidth: '500px', padding: '2rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
                      <File size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem', margin: '0 auto' }} />
                      <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>Audio Playback</h4>
                      <audio src={previewFile.url} controls autoPlay style={{ width: '100%' }} />
                    </div>
                  );
                }

                return (
                  <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', maxWidth: '400px' }}>
                    <AlertCircle size={48} style={{ color: '#eab308', marginBottom: '1rem', margin: '0 auto' }} />
                    <h4 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>Preview Unavailable</h4>
                    <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                      This file format cannot be viewed directly inside the browser. Please download the file to open it.
                    </p>
                    <a
                      href={previewFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem',
                        fontSize: '0.875rem', fontWeight: 600, color: 'white', backgroundColor: 'var(--color-primary)',
                        borderRadius: '6px', textDecoration: 'none'
                      }}
                    >
                      <Download size={16} />
                      <span>Download File</span>
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Styled UI interactions helper styles */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .tree-node:hover {
          background-color: rgba(14, 77, 65, 0.04) !important;
        }
        .tree-folder:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        .folder-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
          border-color: var(--color-primary) !important;
        }
        .file-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08);
          border-color: var(--color-primary) !important;
        }
      `}</style>
    </div>
  );
}
