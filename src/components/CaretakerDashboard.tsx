import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Users, Bell, Calendar as CalendarIcon, Mail, AlertTriangle, Check, Clock, Camera } from "lucide-react";
import NotificationSettings from "./NotificationSettings";
import { format, subDays, isToday, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

interface CaretakerDashboardProps {
  patientId: string;
  patientName: string;
  onBack: () => void;
}

const CaretakerDashboard: React.FC<CaretakerDashboardProps> = ({ patientId, patientName, onBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [patientData, setPatientData] = useState([])
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [medicationName, setMedicationName] = useState("");
  const [medicationDosage, setMedicationDosage] = useState("");
  const [medicationFrequency, setMedicationFrequency] = useState("");
  const [medicationStartDate, setMedicationStartDate] = useState("");
  const [medicationEndDate, setMedicationEndDate] = useState("");
  const [medicationTime, setMedicationTime] = useState("")
  const [addingMedication, setAddingMedication] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMedicationId, setEditingMedicationId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [medications, setMedications] = useState<{
    id: number;
    patient_id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    start_date: string | null;
    end_date: string | null;
    time: string | null;
    taken: string | false;
    taken_date: (string | null)[];
    image_url: string | null;
    created_at: string;
  }[]>([]);

  const patientMedicationList = async () => {
    try {
      let { data: medications, error } = await supabase
        .from('medications')
        .select("*")
        .eq('patient_id', patientId);
      if (error) {
        console.error("fetching medications:", error);
        setPatientData([]);
        return;
      }
      // Ensure taken_date is always an array
      const medsWithTakenDateArray = medications?.map((med) => ({
        ...med,
        taken_date: Array.isArray(med.taken_date) ? med.taken_date : med.taken_date ? [med.taken_date] : [],
      })) || [];
      setPatientData(medsWithTakenDateArray);
    } catch (err) {
      setPatientData([]);
    }
  }

  useEffect(
    () => {
      patientMedicationList()
    }, [patientId]
  )

  useEffect(() => {
    const handleMedicationTaken = (event: CustomEvent) => {
      patientMedicationList();
    };
    window.addEventListener('medicationTaken', handleMedicationTaken as EventListener);
    return () => {
      window.removeEventListener('medicationTaken', handleMedicationTaken as EventListener);
    };
  }, []);

  // Helper function to get all dates in current month
  const getDatesInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const dates = [];
    while (date.getMonth() === month) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return dates;
  };

  // Get current year and month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const datesInCurrentMonth = getDatesInMonth(currentYear, currentMonth).map(d =>
    d.toISOString().slice(0, 10)
  );
  const medsInCurrentMonth = patientData.filter(med => {
    return med.taken_date.some(dateStr => datesInCurrentMonth.includes(dateStr));
  });
  const activeMedsInMonth = patientData.filter(med => {
    const start = med.start_date ? new Date(med.start_date) : null;
    const end = med.end_date ? new Date(med.end_date) : null;
    return (
      (!start || start <= now) &&
      (!end || end >= now)
    );
  });

  const totalDosesExpected = activeMedsInMonth.length * datesInCurrentMonth.length;
  let takenDosesCount = 0;
  patientData.forEach(med => {
    med.taken_date.forEach(dateStr => {
      if (datesInCurrentMonth.includes(dateStr)) {
        takenDosesCount++;
      }
    });
  });

  // Calculate adherence rate as percentage
  const adherenceRate = totalDosesExpected > 0 ? Math.round((takenDosesCount / totalDosesExpected) * 100) : 0;
  const todayStr = now.toISOString().slice(0, 10);
  const pastDatesInCurrentMonth = datesInCurrentMonth.filter(dateStr => dateStr <= todayStr);
  const totalDosesExpectedPast = activeMedsInMonth.length * pastDatesInCurrentMonth.length;
  let takenDosesCountPast = 0;
  patientData.forEach(med => {
    med.taken_date.forEach(dateStr => {
      if (pastDatesInCurrentMonth.includes(dateStr)) {
        takenDosesCountPast++;
      }
    });
  });

  const missedDoses = totalDosesExpectedPast > 0 ? totalDosesExpectedPast - takenDosesCountPast : 0;
  let currentStreak = 0;
  for (let i = datesInCurrentMonth.length - 1; i >= 0; i--) {
    const dateStr = datesInCurrentMonth[i];
    if (dateStr > now.toISOString().slice(0, 10)) {
      continue;
    }
    // Checking medication taken on this date
    const takenOnDate = patientData.some(med => med.taken_date.includes(dateStr));
    if (takenOnDate) {
      currentStreak++;
    } else {
      break;
    }
  }

  const takenDates = useMemo(() => {
    const allTakenDates = patientData
      .filter((med) => med.taken && med.taken_date)
      .flatMap((med) => med.taken_date || []);
    return new Set(allTakenDates);
  }, [patientData]);

  // today's medication info
  const today = format(new Date(), 'yyyy-MM-dd');
  const dailyMedication = useMemo(() => {
    const todayMeds = patientData.filter(
      (med) =>
        med.start_date <= today &&
        med.end_date >= today
    );

    return {
      name: "Daily Medication Set",
      time: todayMeds[0]?.time ?? "08:00 AM",
      status: takenDates.has(today) ? "completed" : "pending"
    };
  }, [patientData, takenDates]);

  // Create recent activity from last few days
  const recentActivity = useMemo(() => {
    if (!patientData || patientData.length === 0) return [];
    return patientData
      .filter((med) => Array.isArray(med.taken_date) && med.taken_date.length > 0)
      .sort((a, b) => {
        const aLatest = new Date(a.taken_date![a.taken_date!.length - 1] || 0);
        const bLatest = new Date(b.taken_date![b.taken_date!.length - 1] || 0);
        return bLatest.getTime() - aLatest.getTime();
      })
      .slice(0, 5)
      .map((med) => {
        const latestDate = med.taken_date![med.taken_date!.length - 1];

        return {
          date: latestDate,
          taken: med.taken,
          time: med.time
            ? format(new Date(`1970-01-01T${med.time}`), 'h:mm a')
            : null,
          hasPhoto: !!med.image_url,
        };
      });
  }, [patientData]);

  useEffect(() => {
    if (activeTab === "medications") {
      fetchMedications();
    }
  }, [activeTab]);

  const fetchMedications = async () => {
    setLoadingMedications(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMedications(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMedications(false);
    }
  };

  const handleAddMedication = async () => {
    if (!medicationName || !medicationDosage || !medicationFrequency || !medicationStartDate || !medicationEndDate || !medicationTime) {
      setError("Please fill in all medication fields.");
      return;
    }
    setAddingMedication(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("medications")
        .insert([
          {
            patient_id: patientId,
            medication_name: medicationName,
            dosage: medicationDosage,
            frequency: medicationFrequency,
            start_date: medicationStartDate,
            end_date: medicationEndDate,
            time: medicationTime,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setMedications((prev) => [data, ...prev]);
      setMedicationName("");
      setMedicationDosage("");
      setMedicationFrequency("");
      setMedicationStartDate("");
      setMedicationEndDate("");
      setMedicationTime("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingMedication(false);
    }
  };

  const handleSendReminderEmail = () => {
    console.log("Sending reminder email to patient...");
    alert("Reminder email sent to patient ID: " + patientId);
  };

  const handleConfigureNotifications = () => {
    setActiveTab("notifications");
  };

  const handleViewCalendar = () => {
    setActiveTab("calendar");
  };

  //  edit button
  const handleEditClick = (med: {
    id: number;
    medication_name: string;
    dosage: string;
    frequency: string;
    start_date: string | null;
    end_date: string | null;
    time?: string | null;
  }) => {
    setEditingMedicationId(med.id);
    setMedicationName(med.medication_name);
    setMedicationDosage(med.dosage);
    setMedicationFrequency(med.frequency);
    setMedicationStartDate(med.start_date || "");
    setMedicationEndDate(med.end_date || "");
    setMedicationTime(med.time || "");
    setIsEditing(true);
    setError(null);
  };

  // canceling edit
  const handleCancelEdit = () => {
    setEditingMedicationId(null);
    setMedicationName("");
    setMedicationDosage("");
    setMedicationFrequency("");
    setMedicationStartDate("");
    setMedicationEndDate("");
    setMedicationTime("");
    setIsEditing(false);
    setError(null);
  };

  // updating medication
  const handleUpdateMedication = async () => {
    if (!medicationName || !medicationDosage || !medicationFrequency || !medicationStartDate || !medicationEndDate || !medicationTime) {
      setError("Please fill in all medication fields.");
      return;
    }
    setAddingMedication(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("medications")
        .update({
          medication_name: medicationName,
          dosage: medicationDosage,
          frequency: medicationFrequency,
          start_date: medicationStartDate,
          end_date: medicationEndDate,
          time: medicationTime,
        })
        .eq("id", editingMedicationId)
        .select()
        .single();
      if (error) throw error;
      setMedications((prev) =>
        prev.map((med) => (med.id === editingMedicationId ? data : med))
      );
      handleCancelEdit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingMedication(false);
    }
  };

  // deleting medication
  const handleDeleteClick = async (id: number) => {
    if (!confirm("Are you sure you want to delete this medication?")) {
      return;
    }
    setLoadingMedications(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setMedications((prev) => prev.filter((med) => med.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMedications(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Caretaker Dashboard</h2>
            <p className="text-white/90 text-lg">Monitoring {patientName}'s medication adherence</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{adherenceRate}%</div>
            <div className="text-white/80">Adherence Rate</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-white/80">Current Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{missedDoses}</div>
            <div className="text-white/80">Missed This Month</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{recentActivity.filter(a => a.taken).length}</div>
            <div className="text-white/80">Taken This Week</div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Today's Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{dailyMedication.name}</h4>
                    <p className="text-sm text-muted-foreground">{dailyMedication.time}</p>
                  </div>
                  <Badge variant={dailyMedication.status === "pending" ? "destructive" : "secondary"}>
                    {dailyMedication.status === "pending" ? "Pending" : "Completed"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleSendReminderEmail}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminder Email
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleConfigureNotifications}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Configure Notifications
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleViewCalendar}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  View Calendar
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activity.taken ? (
                        <Check className="text-green-500" />
                      ) : (
                        <AlertTriangle className="text-red-500" />
                      )}
                      <span>{format(new Date(activity.date), "MMM d, yyyy")}</span>
                    </div>
                    <div>{activity.taken ? activity.time : "Missed"}</div>
                    {activity.hasPhoto && (
                      <Camera className="w-5 h-5 text-blue-600" />
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Medication Calendar Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
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
                        const isPast = isBefore(date, startOfDay(new Date()));
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
                </div>

                <div>
                  <h4 className="font-medium mb-4">
                    Details for {format(selectedDate, 'MMMM d, yyyy')}
                  </h4>

                  <div className="space-y-4">
                    {takenDates.has(format(selectedDate, 'yyyy-MM-dd')) ? (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">Medication Taken</span>
                        </div>
                        <p className="text-sm text-green-700">
                          {patientName} successfully took their medication on this day.
                        </p>
                      </div>
                    ) : isBefore(selectedDate, startOfDay(new Date())) ? (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-800">Medication Missed</span>
                        </div>
                        <p className="text-sm text-red-700">
                          {patientName} did not take their medication on this day.
                        </p>
                      </div>
                    ) : isToday(selectedDate) ? (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-800">Today</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Monitor {patientName}'s medication status for today.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Future Date</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          This date is in the future.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings patientId={patientId} />
        </TabsContent>
        <TabsContent value="medications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 text-red-600 font-semibold">{error}</div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  isEditing ? handleUpdateMedication() : handleAddMedication();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="medicationName" className="block font-medium mb-1">
                    Medication Name
                  </label>
                  <input
                    id="medicationName"
                    type="text"
                    value={medicationName}
                    onChange={(e) => setMedicationName(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="medicationDosage" className="block font-medium mb-1">
                    Dosage
                  </label>
                  <input
                    id="medicationDosage"
                    type="text"
                    value={medicationDosage}
                    onChange={(e) => setMedicationDosage(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="medicationFrequency" className="block font-medium mb-1">
                    Frequency
                  </label>
                  <input
                    id="medicationFrequency"
                    type="text"
                    value={medicationFrequency}
                    onChange={(e) => setMedicationFrequency(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="medicationStartDate" className="block font-medium mb-1">
                    Start Date
                  </label>
                  <input
                    id="medicationStartDate"
                    type="date"
                    value={medicationStartDate}
                    onChange={(e) => setMedicationStartDate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="medicationEndDate" className="block font-medium mb-1">
                    End Date
                  </label>
                  <input
                    id="medicationEndDate"
                    type="date"
                    value={medicationEndDate}
                    onChange={(e) => setMedicationEndDate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="medicationTime" className="block font-medium mb-1">
                    Time
                  </label>
                  <input
                    id="medicationTime"
                    type="time"
                    value={medicationTime}
                    onChange={(e) => setMedicationTime(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={addingMedication} className="flex-1">
                    {addingMedication ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Medication" : "Add Medication")}
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="flex-1">
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              {loadingMedications ? (
                <Progress className="mt-4" />
              ) : (
                <ul className="mt-4 space-y-2">
                  {medications.length === 0 ? (
                    <li>No medications found.</li>
                  ) : (
                    medications.map((med) => (
                      <li key={med.id} className="border rounded p-3 flex flex-col space-y-2">
                        <div className="font-semibold">{med.medication_name}</div>
                        <div>Dosage: {med.dosage}</div>
                        <div>Frequency: {med.frequency}</div>
                        <div>Start Date: {med.start_date}</div>
                        <div>End Date: {med.end_date ? format(new Date(med.end_date), "MMM d, yyyy") : "N/A"}</div>
                        <div>Time: {med.time ? (() => {
                          try {
                            return format(new Date(`1970-01-01T${med.time}`), "h:mm a");
                          } catch {
                            return med.time;
                          }
                        })() : "N/A"}</div>
                        <div className="space-x-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(med)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(med.id)}>
                            Delete
                          </Button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default CaretakerDashboard;
