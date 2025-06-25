import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Check, Calendar as CalendarIcon, Image, User } from "lucide-react";
import MedicationTracker from "./MedicationTracker";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

const PatientDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [takenDates, setTakenDates] = useState<Set<string>>(new Set());
  const [username, setUsername] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<Array<{ taken_date: string }>>([]);
  const { user } = useAuth();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isTodaySelected = isToday(selectedDate);
  const isSelectedDateTaken = takenDates.has(selectedDateStr);

  const handleMarkTaken = async (date: string, imageFile?: File) => {
    if (!user) {
      toast({
        title: "You must be logged in to mark medication as taken.",
      });
      return;
    }

    let imageUrl: string | null = null;

    // Upload image to Supabase Storage 
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `medication-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('medication-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error('Error uploading image:', uploadError.message);
        toast({
          title: "Failed to upload image. Please try again.",
        });
        return;
      }

      const { data } = supabase.storage
        .from('medication-images')
        .getPublicUrl(filePath);

      imageUrl = data.publicUrl;
      console.log('Image URL:', imageUrl);
    }

    try {
      const { data: meds, error: fetchError } = await supabase
        .from('medications')
        .select('id, taken_date')
        .eq('patient_id', user.id)
        .lte('start_date', date)
        .or(`end_date.gte.${date},end_date.is.null`);

      if (fetchError || !meds || meds.length === 0) {
        console.error('Error fetching medication:', fetchError?.message);
        toast({
          title: "No medication found for this date.",
        });
        return;
      }
      const updates = meds.map(async (med) => {
        const updatedTakenDates = Array.isArray(med.taken_date)
          ? [...new Set([...med.taken_date, date])]
          : [date];

        return supabase
          .from('medications')
          .update({
            taken: true,
            image_url: imageUrl,
            taken_date: updatedTakenDates,
          })
          .eq('id', med.id);
      });

      await Promise.all(updates);
      setTakenDates(prev => new Set(prev).add(date));
      window.dispatchEvent(new CustomEvent('medicationTaken', { detail: { date } }));
      toast({
        title: "Medication marked as taken and image uploaded successfully.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const getStreakCount = () => {
    let streak = 0;
    let currentDate = new Date(today);

    while (takenDates.has(format(currentDate, 'yyyy-MM-dd')) && streak < 30) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!</h2>
            <p className="text-white/90 text-lg">
              Ready to stay on track with your medication{username ? `, ${username}` : ''}?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{getStreakCount()}</div>
            <div className="text-white/80">Day Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{takenDates.has(todayStr) ? "✓" : "○"}</div>
            <div className="text-white/80">Today's Status</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{Math.round((takenDates.size / 30) * 100)}%</div>
            <div className="text-white/80">Monthly Rate</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Medication */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                {isTodaySelected ? "Today's Medication" : `Medication for ${format(selectedDate, 'MMMM d, yyyy')}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MedicationTracker
                date={selectedDateStr}
                isTaken={isSelectedDateTaken}
                onMarkTaken={handleMarkTaken}
                isToday={isTodaySelected}
                patientId={user?.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Medication Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                modifiersClassNames={{
                  selected: "bg-blue-600 text-white hover:bg-blue-700",
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isTaken = takenDates.has(dateStr);
                    const isPast = isBefore(date, startOfDay(today));
                    const isCurrentDay = isToday(date);

                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {isTaken && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {!isTaken && isPast && !isCurrentDay && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    );
                  }
                }}
              />

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Medication taken</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span>Missed medication</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
