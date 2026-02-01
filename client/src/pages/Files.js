import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchFiles, deleteFileAsync } from '../store/slices/fileSlice';
import { fetchCards } from '../store/slices/cardSlice';
import { Trash2, FileText, Search, FolderOpen, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word (DOCX)' },
  { value: 'doc', label: 'Word (DOC)' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'xls', label: 'Excel (XLS)' },
  { value: 'txt', label: 'Text (TXT)' },
  { value: 'md', label: 'Markdown (MD)' },
  { value: 'json', label: 'JSON' },
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'gif', label: 'GIF' },
];

const Files = () => {
  const dispatch = useDispatch();
  const { files, loading, deleting, error, pagination } = useSelector((state) => state.files);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch files with pagination, search, and sort
  useEffect(() => {
    dispatch(fetchFiles({
      page: currentPage,
      limit: pageSize,
      search: appliedSearch || undefined,
      typeFilter: typeFilter || undefined,
      sortBy,
      sortOrder,
    }));
  }, [currentPage, pageSize, appliedSearch, typeFilter, sortBy, sortOrder, dispatch]);

  const handleDeleteClick = (file) => {
    setDeleteConfirm(file);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const file = deleteConfirm;
    try {
      const result = await dispatch(deleteFileAsync(file.filename)).unwrap();
      toast.success(`Deleted "${file.originalName}" and ${result.deletedCards} associated card(s)`);
      dispatch(fetchCards());
      // Refresh list (may need to go back a page if current page becomes empty)
      const { total } = pagination;
      const newTotal = Math.max(0, total - 1);
      const newTotalPages = Math.ceil(newTotal / pageSize) || 1;
      const nextPage = currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;
      setCurrentPage(nextPage);
dispatch(fetchFiles({
          page: nextPage,
          limit: pageSize,
          search: appliedSearch || undefined,
          typeFilter: typeFilter || undefined,
          sortBy,
          sortOrder,
        }));
    } catch (err) {
      toast.error(err || 'Failed to delete file');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pt-12 sm:pt-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          File Management
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          View and manage your uploaded files. Deleting a file removes all associated cards.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TYPE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Per page:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Upload Files</span>
          </Link>
        </div>

        {/* Sort - below search row with arrows */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <button
            type="button"
            onClick={() => {
              setSortBy('name');
              setSortOrder(sortBy === 'name' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${sortBy === 'name' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            Name
          </button>
          <button
            type="button"
            onClick={() => {
              setSortBy('type');
              setSortOrder(sortBy === 'type' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${sortBy === 'type' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            Type
          </button>
          <button
            type="button"
            onClick={() => {
              setSortBy('date');
              setSortOrder(sortBy === 'date' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${sortBy === 'date' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            Date
          </button>
          <div className="flex items-center gap-0.5 ml-2">
            <button
              type="button"
              onClick={() => { setSortOrder('asc'); setCurrentPage(1); }}
              className={`p-1.5 rounded border transition-colors ${sortOrder === 'asc' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="Ascending (A–Z)"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setSortOrder('desc'); setCurrentPage(1); }}
              className={`p-1.5 rounded border transition-colors ${sortOrder === 'desc' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="Descending (Z–A)"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <p>Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {appliedSearch || typeFilter
                ? 'No files match your search or filter.'
                : 'No uploaded files yet.'}
            </p>
            {!appliedSearch && !typeFilter && (
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 mt-3 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <FolderOpen className="h-4 w-4" />
                Upload your first file
              </Link>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200 dark:divide-gray-600">
              {files.map((file) => (
                <li
                  key={file.filename}
                  className="flex items-center justify-between py-4 gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-6 w-6 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {file.cardCount} card{file.cardCount !== 1 ? 's' : ''} created
                        {file.uploadedAt && (
                          <> · Uploaded {new Date(file.uploadedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(file)}
                      disabled={deleting === file.filename}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete file and all associated cards"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pagination.total > 0 ? (
                    pagination.total <= pageSize ? (
                      <>Showing all {pagination.total} file{pagination.total !== 1 ? 's' : ''}</>
                    ) : (
                      <>
                        Showing {(pagination.page - 1) * pageSize + 1}–
                        {Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total} files
                      </>
                    )
                  ) : (
                    'No files'
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Page {p}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete file?
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Deleting <strong className="text-gray-900 dark:text-white">{deleteConfirm.originalName}</strong> will permanently remove the file and all <strong>{deleteConfirm.cardCount} associated card{deleteConfirm.cardCount !== 1 ? 's' : ''}</strong>. This action cannot be undone.
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Are you sure you want to delete?
                </p>
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={deleting === deleteConfirm.filename}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
                  >
                    {deleting === deleteConfirm.filename ? 'Deleting...' : 'Yes, delete file and cards'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Files;
