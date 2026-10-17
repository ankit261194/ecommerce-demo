import React, { useState, useEffect } from 'react';
import { Zap, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DeliverySlotPicker({ onSlotSelect, selectedSlot, pincode }) {
  const [loading, setLoading] = useState(false);
  const [slotData, setSlotData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('express'); // 'express' | 'scheduled' | 'standard'

  const fetchSlots = async (dateStr) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateStr) params.append('date', dateStr);
      if (pincode) params.append('pincode', pincode);

      const res = await fetch(`/api/logistics/slots/available?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSlotData(data);

        // Auto-select standard or first available if none selected
        if (!selectedSlot) {
          if (data.hyperlocal1Hour?.isAvailable) {
            onSlotSelect?.({
              slotKey: data.hyperlocal1Hour.slotKey,
              title: data.hyperlocal1Hour.title,
              type: data.hyperlocal1Hour.type,
              fee: data.hyperlocal1Hour.fee,
              isHyperlocal1Hour: true,
              date: data.date,
              targetDeliveryTime: data.hyperlocal1Hour.targetDeliveryTime,
            });
          } else {
            onSlotSelect?.({
              slotKey: 'standard',
              title: 'Standard Delivery (2-4 Business Days)',
              type: 'STANDARD',
              fee: 0,
              isHyperlocal1Hour: false,
              date: data.date,
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, pincode]);

  const handleSelect = (slot) => {
    onSlotSelect?.(slot);
  };

  // Generate next 5 dates for scheduled slots
  const availableDates = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    return { dateStr, dayLabel };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Choose Delivery Slot &amp; Speed
          </h3>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
            Point #42
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {pincode ? `Delivering to PIN: ${pincode}` : 'Dynamic Slots'}
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('express')}
          className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition ${
            activeTab === 'express'
              ? 'bg-amber-500 text-black font-semibold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>1-Hr Express</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scheduled')}
          className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition ${
            activeTab === 'scheduled'
              ? 'bg-amber-500 text-black font-semibold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Scheduled</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('standard');
            handleSelect({
              slotKey: 'standard',
              title: 'Standard Delivery (2-4 Business Days)',
              type: 'STANDARD',
              fee: 0,
              isHyperlocal1Hour: false,
              date: selectedDate,
            });
          }}
          className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition ${
            activeTab === 'standard'
              ? 'bg-amber-500 text-black font-semibold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Standard (Free)</span>
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-400 text-xs">
          Loading live slot availability...
        </div>
      ) : (
        <div>
          {/* TAB 1: 1-Hour Hyperlocal Express */}
          {activeTab === 'express' && (
            <div className="space-y-3">
              {slotData?.hyperlocal1Hour?.isAvailable ? (
                <div
                  onClick={() =>
                    handleSelect({
                      slotKey: slotData.hyperlocal1Hour.slotKey,
                      title: slotData.hyperlocal1Hour.title,
                      type: slotData.hyperlocal1Hour.type,
                      fee: slotData.hyperlocal1Hour.fee,
                      isHyperlocal1Hour: true,
                      date: slotData.date,
                      targetDeliveryTime: slotData.hyperlocal1Hour.targetDeliveryTime,
                    })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition relative overflow-hidden ${
                    selectedSlot?.isHyperlocal1Hour
                      ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">
                          {slotData.hyperlocal1Hour.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                          ⚡ Guaranteed 60 Mins
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {slotData.hyperlocal1Hour.description}
                      </p>
                      <div className="text-[11px] text-emerald-400 font-mono pt-1">
                        ✓ {slotData.hyperlocal1Hour.remainingCapacity} slots remaining in this hour
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-400 font-mono">
                        +₹{slotData.hyperlocal1Hour.fee}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase">Speed Surcharge</span>
                    </div>
                  </div>

                  {selectedSlot?.isHyperlocal1Hour && (
                    <div className="absolute top-2 right-2 text-amber-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    1-Hour Hyperlocal Express Unavailable Right Now
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {slotData?.hyperlocal1Hour?.reason || 'Operating hours are 07:00 to 22:00 or current slot is at maximum capacity.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('scheduled')}
                    className="mt-2 text-xs text-amber-400 hover:underline"
                  >
                    Select a scheduled time slot instead →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Scheduled Time Slots */}
          {activeTab === 'scheduled' && (
            <div className="space-y-3">
              {/* Date pills */}
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {availableDates.map((item) => (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition ${
                      selectedDate === item.dateStr
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {item.dayLabel}
                  </button>
                ))}
              </div>

              {/* Slot cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {slotData?.slots?.map((slot) => {
                  const isSelected = selectedSlot?.slotKey === slot.slotKey && selectedSlot?.date === selectedDate;
                  const isAvailable = slot.isAvailable;

                  return (
                    <div
                      key={slot.slotKey}
                      onClick={() =>
                        isAvailable &&
                        handleSelect({
                          slotKey: slot.slotKey,
                          title: slot.title,
                          type: slot.type,
                          fee: slot.fee,
                          isHyperlocal1Hour: false,
                          date: selectedDate,
                          startTime: slot.startTime,
                          endTime: slot.endTime,
                        })
                      }
                      className={`p-3 rounded-lg border text-xs transition relative ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500'
                          : isAvailable
                          ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700 cursor-pointer'
                          : 'bg-slate-950/20 border-slate-800/40 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-slate-200">{slot.title}</div>
                        <span className="font-mono text-amber-400 font-bold">
                          {slot.fee > 0 ? `+₹${slot.fee}` : 'FREE'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
                        <span className="font-mono">{slot.startTime} - {slot.endTime}</span>
                        <span>
                          {slot.status === 'EXPIRED' ? (
                            <span className="text-slate-500">Expired</span>
                          ) : slot.status === 'EXHAUSTED' ? (
                            <span className="text-rose-400">Slot Full</span>
                          ) : slot.status === 'FAST_FILLING' ? (
                            <span className="text-amber-400">⚡ {slot.remainingCapacity} left</span>
                          ) : (
                            <span className="text-emerald-400">Available</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Standard Delivery */}
          {activeTab === 'standard' && (
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Standard Economy Delivery</h4>
                  <p className="text-xs text-slate-400">
                    Delivered in 2 to 4 business days via verified carrier fleet
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-400 font-mono">FREE</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Standard courier routing and scheduled dispatch. No express surcharge.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Slot Confirmation Footer */}
      {selectedSlot && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Selected: <strong className="text-white">{selectedSlot.title}</strong>{' '}
              {selectedSlot.date ? `(${selectedSlot.date})` : ''}
            </span>
          </div>
          <span className="font-mono font-bold text-amber-400">
            {selectedSlot.fee > 0 ? `+₹${selectedSlot.fee}` : 'Free Delivery'}
          </span>
        </div>
      )}
    </div>
  );
}
