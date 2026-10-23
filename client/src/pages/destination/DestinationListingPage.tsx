import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Destination, DestinationImage } from '../../types/index.js';
import { Settings, CheckCircle2, AlertCircle, Save, IndianRupee, Utensils, Upload, Image as ImageIcon, Loader2, Sparkles, Trash2, Plus } from 'lucide-react';
import { CldImage } from '../../components/common/CldImage.js';

export const DestinationListingPage: React.FC = () => {
  const [profile, setProfile] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMyDestinationProfile()
      .then((res) => {
        if (res.success) setProfile(res.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingCover(true);
    setError(null);
    try {
      const res = await api.uploadImageFile(file, 'schooldest/destinations/covers');
      if (res.success && res.data) {
        const cdnUrl = res.data.secureUrl || res.data.url;
        setProfile({ ...profile, coverImage: cdnUrl });
        setSuccessMsg('Cover photo uploaded to Cloudinary CDN! Click "Save Profile Changes" below to publish.');
      } else {
        throw new Error(res.message || 'Image upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image to Cloudinary');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const res = await api.uploadImageFile(file, 'schooldest/destinations/logos');
      if (res.success && res.data) {
        const cdnUrl = res.data.secureUrl || res.data.url;
        setProfile({ ...profile, logo: cdnUrl });
        setSuccessMsg('Logo uploaded to Cloudinary CDN! Click "Save Profile Changes" below to publish.');
      } else {
        throw new Error(res.message || 'Logo upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo to Cloudinary');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingGallery(true);
    setError(null);
    try {
      const res = await api.uploadDestinationGallery(profile.id, file, galleryCaption);
      if (res.success && res.data) {
        const updatedImages = [...(profile.images || []), res.data];
        setProfile({ ...profile, images: updatedImages });
        setSuccessMsg('Gallery photo uploaded to Cloudinary successfully!');
        setGalleryCaption('');
      } else {
        throw new Error(res.message || 'Gallery upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload gallery image');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDeleteGallery = async (imageId: string) => {
    if (!profile) return;
    try {
      const res = await api.deleteDestinationGalleryImage(profile.id, imageId);
      if (res.success) {
        setProfile({
          ...profile,
          images: (profile.images || []).filter((img) => img.id !== imageId),
        });
        setSuccessMsg('Gallery image removed successfully.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete gallery image');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const res = await api.updateMyDestinationProfile(profile);
      if (res.success) {
        setSuccessMsg('Destination profile and operating policies updated successfully.');
      }
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-rose-500">Destination profile not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">
            Listing Configuration
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display mt-0.5">
            Destination Profile & Policies
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage your public-facing listing, group limits, operating times, and policies.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Cloudinary Media & Branding Assets */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  Media & Visual Branding (Cloudinary CDN)
                </h3>
                <p className="text-[11px] text-slate-500">
                  High-resolution venue photography delivered securely through Cloudinary global CDN.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-500" />
                Cloudinary Optimized
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Cover Image */}
              <div className="md:col-span-2 space-y-2">
                <label className="block font-bold text-slate-700">Cover Banner Image</label>
                <div className="relative h-44 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 group flex items-center justify-center">
                  {profile.coverImage ? (
                    <>
                      <img
                        src={profile.coverImage}
                        alt="Destination Cover"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-white/95 hover:bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform hover:scale-105">
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Change Cover</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadCover}
                            className="hidden"
                            disabled={uploadingCover}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs mb-2">No cover image uploaded yet</p>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Cover Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadCover}
                          className="hidden"
                          disabled={uploadingCover}
                        />
                      </label>
                    </div>
                  )}

                  {uploadingCover && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                      <span className="font-bold text-xs text-slate-700">Uploading to Cloudinary...</span>
                    </div>
                  )}
                </div>
                {profile.coverImage && (
                  <p className="text-[10px] text-slate-400 truncate font-mono">
                    CDN: {profile.coverImage}
                  </p>
                )}
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Venue Logo / Icon</label>
                <div className="relative h-44 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 group flex items-center justify-center">
                  {profile.logo ? (
                    <>
                      <img
                        src={profile.logo}
                        alt="Venue Logo"
                        className="w-24 h-24 object-contain"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer px-3 py-1.5 bg-white/95 hover:bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Change Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadLogo}
                            className="hidden"
                            disabled={uploadingLogo}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold shadow-sm">
                        <Upload className="w-3 h-3" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLogo}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                      </label>
                    </div>
                  )}

                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                      <span className="font-bold text-xs text-slate-700">Uploading...</span>
                    </div>
                  )}
                </div>
                {profile.logo && (
                  <p className="text-[10px] text-slate-400 truncate font-mono">
                    CDN: {profile.logo}
                  </p>
                )}
              </div>
            </div>

            {/* Destination Gallery Manager */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Excursion Photo Gallery</h4>
                  <p className="text-[10px] text-slate-500">
                    Add campus, attraction, meal hall, and activity photos displayed on the institute exploration portal.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {profile.images?.length || 0} Photos Uploaded
                </span>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profile.images?.map((img) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                    <CldImage
                      src={img.url}
                      publicId={(img as any).publicId}
                      alt={img.caption || 'Gallery photo'}
                      className="w-full h-full object-cover"
                      width={300}
                      height={200}
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <span className="text-[10px] text-white truncate font-medium">
                        {img.caption || 'Excursion photo'}
                      </span>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteGallery(img.id)}
                          className="p-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-transform hover:scale-110"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Upload New Photo Tile */}
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-3 flex flex-col items-center justify-center gap-2 aspect-video bg-slate-50 hover:bg-slate-100/70 transition-colors">
                  {uploadingGallery ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                      <span className="text-[9px] font-bold text-slate-500">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Caption (optional)"
                        value={galleryCaption}
                        onChange={(e) => setGalleryCaption(e.target.value)}
                        className="w-full px-2 py-0.5 text-[10px] rounded border border-slate-200 bg-white"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow-sm">
                        <Plus className="w-3 h-3" />
                        <span>Add Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadGallery}
                          className="hidden"
                          disabled={uploadingGallery}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              Basic Venue Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Business / Company Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={profile.businessName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Description & Attractions</label>
                <textarea
                  rows={3}
                  name="description"
                  value={profile.description}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Google Business Profile / Maps Link *</label>
                <input
                  type="url"
                  required
                  name="googleProfile"
                  value={profile.googleProfile || ''}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Official Website (Optional)</label>
                <input
                  type="url"
                  name="website"
                  value={profile.website || ''}
                  onChange={handleChange}
                  placeholder="https://venue.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={profile.state}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              Group Visit Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Min Group Size</label>
                <input
                  type="number"
                  name="minGroupSize"
                  value={profile.minGroupSize}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Group Size</label>
                <input
                  type="number"
                  name="maxGroupSize"
                  value={profile.maxGroupSize}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Guide Needed / Provided?</label>
                <select
                  name="guideAvailable"
                  value={profile.guideAvailable ? 'yes' : 'no'}
                  onChange={(e) => setProfile((prev) => (prev ? { ...prev, guideAvailable: e.target.value === 'yes' } : null))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none bg-white"
                >
                  <option value="no">No (Self-guided)</option>
                  <option value="yes">Yes (Guide Included)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operating Hours</label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    name="openingTime"
                    value={profile.openingTime}
                    onChange={handleChange}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-center"
                  />
                  <span>-</span>
                  <input
                    type="time"
                    name="closingTime"
                    value={profile.closingTime}
                    onChange={handleChange}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configured Ticket Types & Pricing Editor */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Ticket Pricing & Complimentary Ratios</h3>
                <p className="text-[11px] text-slate-500">Live institute group rates. Historical submitted bookings preserve their original quote.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {profile.ticketTypes?.map((t) => (
                <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">{t.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Category: {t.category}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Base Rate (₹)</label>
                      <input
                        type="number"
                        defaultValue={t.basePrice}
                        id={`ticket-price-${t.id}`}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold font-mono text-slate-900 bg-white"
                      />
                    </div>

                    {t.category === 'STUDENT' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Free Staff Ratio (1:X)</label>
                        <input
                          type="number"
                          defaultValue={t.complimentaryStaffRatio}
                          id={`ticket-ratio-${t.id}`}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold font-mono text-slate-900 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const priceInput = document.getElementById(`ticket-price-${t.id}`) as HTMLInputElement;
                        const ratioInput = document.getElementById(`ticket-ratio-${t.id}`) as HTMLInputElement | null;
                        try {
                          await api.updateTicketType(t.id, {
                            basePrice: parseFloat(priceInput.value),
                            complimentaryStaffRatio: ratioInput ? parseInt(ratioInput.value, 10) : undefined,
                          });
                          setSuccessMsg(`Ticket pricing for "${t.name}" updated successfully.`);
                        } catch (err: any) {
                          alert(err.message || 'Failed to update ticket rate');
                        }
                      }}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold"
                    >
                      Update Price
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Facilities & Extra Add-ons Editor */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Facilities & Excursion Add-ons</h3>
                <p className="text-[11px] text-slate-500">Configure buffet meal packages, locker access, and educational guides.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {profile.facilities?.map((f) => (
                <div key={f.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-900">{f.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Category: {f.category}</span>
                    </div>
                    {f.isIncluded && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        Included Free
                      </span>
                    )}
                  </div>

                  <div className="pt-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Price Per Head (₹)</label>
                    <input
                      type="number"
                      defaultValue={f.extraPrice}
                      id={`facility-price-${f.id}`}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const priceInput = document.getElementById(`facility-price-${f.id}`) as HTMLInputElement;
                        try {
                          await api.updateFacility(f.id, {
                            extraPrice: parseFloat(priceInput.value),
                          });
                          setSuccessMsg(`Add-on rate for "${f.name}" updated successfully.`);
                        } catch (err: any) {
                          alert(err.message || 'Failed to update facility price');
                        }
                      }}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold"
                    >
                      Update Add-on Price
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive School Quote Simulator */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 text-white shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                Institute Quote Simulation Preview
              </span>
              <span className="text-[10px] text-slate-400">Based on live configured rates</span>
            </div>

            <p className="text-xs text-slate-300">
              For a sample institute excursion with <strong className="text-white">100 students</strong> and <strong className="text-white">8 teachers</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Student Entry (100)</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  ₹{((profile.ticketTypes?.find((t) => t.category === 'STUDENT')?.basePrice || 350) * 100).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Staff Entry (8 total, 6 free per 1:15 rule)</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  ₹{((profile.ticketTypes?.find((t) => t.category === 'TEACHER')?.basePrice || 250) * Math.max(0, 8 - Math.floor(100 / (profile.ticketTypes?.find((t) => t.category === 'STUDENT')?.complimentaryStaffRatio || 15)))).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Estimated Base Excursion Total</span>
                <span className="text-base font-bold text-white font-mono">
                  ₹{(
                    (profile.ticketTypes?.find((t) => t.category === 'STUDENT')?.basePrice || 350) * 100 +
                    (profile.ticketTypes?.find((t) => t.category === 'TEACHER')?.basePrice || 250) * Math.max(0, 8 - Math.floor(100 / (profile.ticketTypes?.find((t) => t.category === 'STUDENT')?.complimentaryStaffRatio || 15)))
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
