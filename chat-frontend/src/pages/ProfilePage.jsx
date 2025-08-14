import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axiosConfig';
import { Camera, Edit2, Check, X, Trash2, UploadCloud } from 'lucide-react';
import defaultAvatar from '../assets/defaultpfp.jpg';
import { toast } from 'react-toastify';

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [editingName, setEditingName] = useState(false);
  const [previewPic, setPreviewPic] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const dropdownRef = useRef();

  useEffect(() => {
    setPreviewPic(null);
    setSelectedFile(null);
  }, [user?.profilePic]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameSave = async () => {
    if (!name.trim() || name.trim() === user.name) {
      setEditingName(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.put(
        '/users/profile',
        { name: name.trim() },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      );
      setUser(res.data);
      setEditingName(false);
    } catch (err) {
      setError('Failed to update name');
      toast.error(err.response?.data?.message || "failed to save name");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewPic(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePicUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('profilePic', selectedFile);
    try {
      setLoading(true);
      const res = await axios.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setUser(res.data);
    } catch (err) {
      setError('Failed to upload image');
      toast.error(err.response?.data?.message || "Failed to upload pic");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProfilePic = async () => {
    try {
      setLoading(true);
      const res = await axios.delete('/users/removeProfilePic', {
        withCredentials: true,
      });
      setUser(res.data);
      setPreviewPic(null);
    } catch (err) {
      setError('Failed to remove profile picture');
      toast.error(err.response?.data?.message || "Failed to remove profile pic");
    } finally {
      setLoading(false);
      setDropdownOpen(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-[#1d232a] text-[#d5d5d5]">
      <h1 className="text-2xl font-semibold mb-4 text-white">My Profile</h1>

      {/* Profile Picture */}
      <div className="relative">
        <img
          src={previewPic || user?.profilePic || defaultAvatar}
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover border-2 border-[#191e24]"
        />
        <div className="absolute bottom-0 right-0" ref={dropdownRef}>
          <button
            className="bg-[#191e24] p-1 rounded-full shadow hover:bg-gray-700"
            onClick={() => setDropdownOpen((prev) => !prev)}
            title="Profile photo options"
          >
            <Camera size={20} className="text-[#605dff]" />
          </button>
          {dropdownOpen && (
            <div className="absolute bottom-10 right-0 bg-[#191e24] border border-[#605dff] rounded shadow z-10 w-70">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-[#d5d5d5] hover:bg-gray-700 flex items-center"
              >
                <UploadCloud size={16} className="mr-2 text-[#605dff]" />
                Change Profile Picture
                <p className="text-red-400 text-s ml-1">(Max 1MB)</p>
              </button>
              {user?.profilePic && (
                <button
                  onClick={handleRemoveProfilePic}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 flex items-center"
                >
                  <Trash2 size={16} className="mr-2 text-red-400" />
                  Remove Profile Picture
                </button>
              )}
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Save/Cancel image preview */}
      {selectedFile && (
        <div className="mt-2 flex items-center space-x-2">
          <button
            disabled={loading}
            onClick={handlePicUpload}
            className="btn btn-sm bg-[#605dff] text-white hover:bg-[#504bf1] flex items-center"
          >
            <Check size={16} className="mr-1" /> Save
          </button>
          <button
            disabled={loading}
            onClick={() => {
              setSelectedFile(null);
              setPreviewPic(null);
            }}
            className="btn btn-sm btn-ghost text-[#d5d5d5] hover:bg-gray-700 flex items-center"
          >
            <X size={16} className="mr-1" /> Cancel
          </button>
        </div>
      )}

      {/* Read-only Fields */}
      <div className="mt-6 w-full max-w-md">
        <label className="block text-[#d5d5d5]">Username</label>
        <input
          type="text"
          value={user?.username || ''}
          disabled
          className="input input-bordered w-full mb-4 bg-[#191e24] border-gray-600 text-white cursor-not-allowed"
        />

        <label className="block text-[#d5d5d5]">Email</label>
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className="input input-bordered w-full mb-4 bg-[#191e24] border-gray-600 text-white cursor-not-allowed"
        />

        {/* Name Editable */}
        <label className="block text-[#d5d5d5] flex items-center justify-between">
          Name
          {!editingName && (
            <button
              onClick={() => setEditingName(true)}
              className="btn btn-ghost btn-xs text-[#605dff]"
              title="Edit name"
            >
              <Edit2 size={16} />
            </button>
          )}
        </label>
        {editingName ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered flex-1 bg-[#191e24] border-gray-600 text-white"
            />
            <button
              disabled={loading}
              onClick={handleNameSave}
              className="btn btn-primary btn-sm flex items-center bg-[#605dff] text-white hover:bg-[#504bf1]"
            >
              <Check size={16} className="mr-1" /> Save
            </button>
            <button
              disabled={loading}
              onClick={() => {
                setEditingName(false);
                setName(user.name || '');
              }}
              className="btn btn-ghost btn-sm text-[#d5d5d5] hover:bg-gray-700 flex items-center"
            >
              <X size={16} className="mr-1" /> Cancel
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={user?.name || ''}
            disabled
            className="input input-bordered w-full mb-4 bg-[#191e24] border-gray-600 text-white cursor-not-allowed"
          />
        )}
      </div>
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  );
};

export default ProfilePage;
