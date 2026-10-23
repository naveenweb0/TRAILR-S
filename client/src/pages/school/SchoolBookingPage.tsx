import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Destination, TicketType, DestinationFacility } from '../../types/index.js';
import {
  Calendar,
  Clock,
  Users,
  Utensils,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  MapPin,
} from 'lucide-react';
import { SkeletonDashboard } from '../../components/common/Skeleton.js';

export const SchoolBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const destinationId = searchParams.get('destinationId');
  const initialDate = searchParams.get('visitDate') || '';

  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  // Section A: Visit Info
  const [visitDate, setVisitDate] = useState(initialDate);
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [tripPurpose, setTripPurpose] = useState('');
  const [ageGroups, setAgeGroups] = useState('');

  // Section B: Group Info
  const [studentCount, setStudentCount] = useState<number>(0);
  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [staffCount, setStaffCount] = useState<number>(0);

  // Section C: Selected Facilities
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<Record<string, boolean>>({});

  // Section D: Transport
  const [requiresTransport, setRequiresTransport] = useState<boolean>(false);
  const [transportDetails, setTransportDetails] = useState({
    pickupAddress: user?.school?.address || '',
    pickupCity: user?.school?.city || '',
    pickupTime: '',
    returnJourney: true,
    passengerCount: 0,
    preferredVehicle: '',
    numberOfVehicles: 0,
    acPreference: 'AC' as const,
    accessibilityNeeds: '',
    specialInstructions: '',
  });

  // Section E: Additional Notes
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [dietaryNeeds, setDietaryNeeds] = useState('');
  const [schoolNotes, setSchoolNotes] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);

  // Fetch Destination
  useEffect(() => {
    if (!destinationId) return;
    setLoading(true);
    api.getDestinations()
      .then((res) => {
        if (res.success) {
          const found = res.data.find((d: Destination) => d.id === destinationId || d.slug === destinationId);
          if (found) {
            setDestination(found);
            // Default select primary lunch facility if available
            const mealFac = found.facilities?.find((f: any) => f.name.toLowerCase().includes('lunch') || f.name.toLowerCase().includes('buffet'));
            if (mealFac) {
              setSelectedFacilityIds({ [mealFac.id]: true });
            }
          } else {
            setError('Destination not found');
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [destinationId]);

  // Keep transport passenger count aligned with total group
  useEffect(() => {
    const total = (Number(studentCount) || 0) + (Number(teacherCount) || 0) + (Number(staffCount) || 0);
    setTransportDetails((prev) => ({
      ...prev,
      passengerCount: total,
    }));
  }, [studentCount, teacherCount, staffCount]);

  const totalGroupSize = (Number(studentCount) || 0) + (Number(teacherCount) || 0) + (Number(staffCount) || 0);

  // Price calculations
  const primaryStudentTicket = destination?.ticketTypes?.find((t) => t.category === 'STUDENT') || destination?.ticketTypes?.[0];
  const primaryTeacherTicket = destination?.ticketTypes?.find((t) => t.category === 'TEACHER');

  const studentRate = primaryStudentTicket?.basePrice || 350;
  const teacherRate = primaryTeacherTicket?.basePrice || 250;

  // Complimentary teacher ratio (e.g. 1 free staff per 15 students)
  const compRatio = primaryStudentTicket?.complimentaryStaffRatio || 15;
  const freeTeachersCount = Math.floor((Number(studentCount) || 0) / compRatio);
  const paidStaffCount = Math.max(0, (Number(teacherCount) || 0) + (Number(staffCount) || 0) - freeTeachersCount);

  const studentTotalCost = (Number(studentCount) || 0) * studentRate;
  const staffTotalCost = paidStaffCount * teacherRate;

  // Selected facilities total
  let addOnsTotal = 0;
  const facilityItems: any[] = [];

  destination?.facilities?.forEach((fac) => {
    if (selectedFacilityIds[fac.id] && fac.extraPrice > 0) {
      const cost = totalGroupSize * fac.extraPrice;
      addOnsTotal += cost;
      facilityItems.push({
        id: fac.id,
        name: fac.name,
        unitPrice: fac.extraPrice,
        quantity: totalGroupSize,
        total: cost,
      });
    }
  });

  const grandTotalEstimate = studentTotalCost + staffTotalCost + addOnsTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;
    if (!visitDate) {
      setError('Please select a visit date.');
      return;
    }
    if (!acceptPolicies) {
      setError('You must accept the booking and safety policies.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedFacilities = Object.keys(selectedFacilityIds)
        .filter((id) => selectedFacilityIds[id])
        .map((id) => ({ id, quantity: totalGroupSize }));

      const payload = {
        destinationId: destination.id,
        visitDate,
        arrivalTime,
        departureTime,
        studentCount,
        teacherCount,
        staffCount,
        tripPurpose,
        ageGroups,
        specialRequirements,
        dietaryNeeds,
        schoolNotes,
        selectedFacilities,
        requiresTransport,
        transportDetails: requiresTransport ? transportDetails : null,
      };

      const res = await api.createBooking(payload);
      if (res.success) {
        navigate(`/school/bookings?newRef=${res.data.bookingReference}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (allowed.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  if (loading) {
    return <SkeletonDashboard title="Loading Excursion Reservation Desk..." />;
  }

  if (!destination) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-900">Destination Not Selected</h3>
          <p className="text-slate-500 text-xs mt-1 mb-4">Please choose a destination first.</p>
          <Link to="/destinations" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
            Choose Destination
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 relative">
      {/* Full-Screen Glass Modal Loader */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto relative">
              <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 font-display">
                Dispatching Excursion Reservation...
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transmitting booking parameters to destination managers and queuing fleet transport. Please do not close this window.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={`/destinations/${destination.slug || destination.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Destination Profile
          </Link>

          <span className="text-[11px] text-slate-400 font-medium">Step: Structured Booking Request</span>
        </div>

        {/* Selected Destination Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
              <img
                src={destination.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200'}
                alt={destination.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                {destination.category}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">{destination.name}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" /> {destination.city}, {destination.state}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-0.5 shrink-0">
            <div>Group Limits: <strong className="text-slate-900">{destination.minGroupSize} - {destination.maxGroupSize}</strong></div>
            <div>Tour Guide: <strong className={destination.guideAvailable ? "text-emerald-700" : "text-slate-900"}>{destination.guideAvailable ? "Guide Provided" : "Self-guided"}</strong></div>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION A: VISIT INFORMATION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Section A: Visit Date & Timing</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Visit Date *</label>
                <input
                  type="date"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Arrival Time</label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Departure Time</label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Trip Purpose / Theme</label>
                <input
                  type="text"
                  value={tripPurpose}
                  onChange={(e) => setTripPurpose(e.target.value)}
                  placeholder="e.g. Science Curriculum Trip / Annual Institute Picnic"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Classes / Age Groups</label>
                <input
                  type="text"
                  value={ageGroups}
                  onChange={(e) => setAgeGroups(e.target.value)}
                  placeholder="e.g. Grades 7 & 8 (12-14 yrs)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: GROUP INFORMATION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Section B: Group Strength Breakdown</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Count *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={studentCount || ''}
                  onKeyDown={handleNumericKeyDown}
                  onChange={(e) => setStudentCount(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                  placeholder="0"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  ₹{studentRate}/student
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teachers / Faculty *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={teacherCount || ''}
                  onKeyDown={handleNumericKeyDown}
                  onChange={(e) => setTeacherCount(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                  placeholder="0"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                  {freeTeachersCount} Complimentary
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Support Staff</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={staffCount || ''}
                  onKeyDown={handleNumericKeyDown}
                  onChange={(e) => setStaffCount(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                  placeholder="0"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Attendants / Nurses</span>
              </div>

              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 flex flex-col justify-center">
                <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
                  Total Group Size
                </span>
                <span className="text-xl font-extrabold text-blue-900 mt-0.5">
                  {totalGroupSize} <span className="text-xs font-normal text-slate-500">participants</span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION C: FACILITIES & MEALS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Utensils className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Section C: Facilities & Meal Add-ons</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {destination.facilities?.map((fac) => {
                const isSelected = !!selectedFacilityIds[fac.id];
                return (
                  <label
                    key={fac.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        setSelectedFacilityIds({
                          ...selectedFacilityIds,
                          [fac.id]: e.target.checked,
                        })
                      }
                      className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{fac.name}</span>
                        {fac.isIncluded ? (
                          <span className="text-emerald-600 text-[11px] font-semibold">Included</span>
                        ) : (
                          <span className="text-blue-600 text-xs font-extrabold">
                            +₹{fac.extraPrice}/person
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{fac.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* SECTION D: TRANSPORTATION REQUIREMENT (Crucial Workflow Separation) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Truck className="w-4 h-4 text-purple-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Section D: Traveller & Fleet Coordination
                </h3>
                <p className="text-[11px] text-slate-500">
                  Choose whether your institute requires bus transportation.
                </p>
              </div>
            </div>

            {/* MANDATORY CHOICE */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Do you require a traveller / transport service? *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setRequiresTransport(false)}
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    !requiresTransport
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="transportChoice"
                    checked={!requiresTransport}
                    onChange={() => setRequiresTransport(false)}
                    className="mt-1 text-blue-600"
                  />
                  <div>
                    <strong className="block text-xs text-slate-900">
                      No, our institute will arrange transportation
                    </strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Booking request goes directly to the destination venue queue.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setRequiresTransport(true)}
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    requiresTransport
                      ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="transportChoice"
                    checked={requiresTransport}
                    onChange={() => setRequiresTransport(true)}
                    className="mt-1 text-purple-600"
                  />
                  <div>
                    <strong className="block text-xs text-purple-950">
                      Yes, we need transportation assistance
                    </strong>
                    <span className="text-[11px] text-slate-600 mt-0.5 block">
                      Routed to Super Admin fleet coordination queue. Destination does not manage transport.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* If YES: Extra fleet fields */}
            {requiresTransport && (
              <div className="mt-4 p-5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span>Fleet Coordination Details (Sent to Super Admin Queue)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Pickup Address / Campus Gate *</label>
                    <input
                      type="text"
                      value={transportDetails.pickupAddress}
                      onChange={(e) =>
                        setTransportDetails({ ...transportDetails, pickupAddress: e.target.value })
                      }
                      placeholder="Institute Main Campus Gate No. 1"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pickup City *</label>
                    <input
                      type="text"
                      value={transportDetails.pickupCity}
                      onChange={(e) =>
                        setTransportDetails({ ...transportDetails, pickupCity: e.target.value })
                      }
                      placeholder="City"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pickup Time</label>
                    <input
                      type="time"
                      value={transportDetails.pickupTime}
                      onChange={(e) =>
                        setTransportDetails({ ...transportDetails, pickupTime: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Passenger Count</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={transportDetails.passengerCount || ''}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) =>
                        setTransportDetails({
                          ...transportDetails,
                          passengerCount: parseInt(e.target.value.replace(/\D/g, ''), 10) || totalGroupSize,
                        })
                      }
                      placeholder={String(totalGroupSize)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preferred Vehicle Type</label>
                    <select
                      value={transportDetails.preferredVehicle}
                      onChange={(e) =>
                        setTransportDetails({ ...transportDetails, preferredVehicle: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    >
                      <option value="2x 45-seater AC Deluxe Coaches">2x 45-seater AC Deluxe Coaches</option>
                      <option value="3x 45-seater AC Deluxe Coaches">3x 45-seater AC Deluxe Coaches</option>
                      <option value="18-seater AC Force Traveller">18-seater AC Force Traveller</option>
                      <option value="52-seater BharatBenz AC Coach">52-seater BharatBenz AC Coach</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Special Driver & Bus Instructions</label>
                    <input
                      type="text"
                      value={transportDetails.specialInstructions}
                      onChange={(e) =>
                        setTransportDetails({ ...transportDetails, specialInstructions: e.target.value })
                      }
                      placeholder="e.g. GPS tracking, emergency first-aid kit on bus"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION E: ADDITIONAL NOTES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Section E: Dietary & Accessibility Notes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dietary Preferences</label>
                <input
                  type="text"
                  value={dietaryNeeds}
                  onChange={(e) => setDietaryNeeds(e.target.value)}
                  placeholder="Pure vegetarian, Jain meal options, allergy notes"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Special / Mobility Assistance</label>
                <input
                  type="text"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="Wheelchair assistance, medical chaperone"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION F: ITEMIZED ESTIMATE & REVIEW */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-sm">Itemized Quotation Breakdown</span>
              <span className="text-[11px] text-blue-400 font-semibold">Subject to destination acceptance</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">
                  Student Entry ({studentCount} students @ ₹{studentRate})
                </span>
                <span className="font-bold font-mono">₹{studentTotalCost.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">
                  Faculty Entry ({teacherCount + staffCount} staff: {freeTeachersCount} Free, {paidStaffCount} Paid @ ₹{teacherRate})
                </span>
                <span className="font-bold font-mono text-emerald-400">
                  {staffTotalCost === 0 ? 'COMPLIMENTARY' : `₹${staffTotalCost.toLocaleString()}`}
                </span>
              </div>

              {facilityItems.map((fac) => (
                <div key={fac.id} className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                  <span>{fac.name} ({fac.quantity} @ ₹{fac.unitPrice})</span>
                  <span className="font-mono">₹{fac.total.toLocaleString()}</span>
                </div>
              ))}

              <div className="flex justify-between pt-3 text-sm font-extrabold text-white">
                <span>Estimated Venue Total:</span>
                <span className="text-xl text-blue-400 font-mono">₹{grandTotalEstimate.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={acceptPolicies}
                  onChange={(e) => setAcceptPolicies(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>I confirm official institute authorization and accept destination terms.</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all shrink-0"
              >
                {submitting ? 'Submitting Request...' : 'Submit Booking Request'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
