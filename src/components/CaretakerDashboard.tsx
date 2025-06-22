import { useState, useEffect } from "react";
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

  // Mock data for demonstration
  const adherenceRate = 85;
  const currentStreak = 5;
  const missedDoses = 3;

  // Mock data for taken medications (same as in PatientDashboard)
  const takenDates = new Set([
    "2024-06-10", "2024-06-09", "2024-06-07", "2024-06-06",
    "2024-06-05", "2024-06-04", "2024-06-02", "2024-06-01"
  ]);

  const recentActivity = [
    { date: "2024-06-10", taken: true, time: "8:30 AM", hasPhoto: true },
    { date: "2024-06-09", taken: true, time: "8:15 AM", hasPhoto: false },
    { date: "2024-06-08", taken: false, time: null, hasPhoto: false },
    { date: "2024-06-07", taken: true, time: "8:45 AM", hasPhoto: true },
    { date: "2024-06-06", taken: true, time: "8:20 AM", hasPhoto: false },
  ];

  const dailyMedication = {
    name: "Daily Medication Set",
    time: "8:00 AM",
    status: takenDates.has(format(new Date(), 'yyyy-MM-dd')) ? "completed" : "pending"
  };

  const [medications, setMedications] = useState<{
    id: number;
    patient_id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  }[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [medicationName, setMedicationName] = useState("");
  const [medicationDosage, setMedicationDosage] = useState("");
  const [medicationFrequency, setMedicationFrequency] = useState("");
  const [medicationStartDate, setMedicationStartDate] = useState("");
  const [medicationEndDate, setMedicationEndDate] = useState("");
  const [addingMedication, setAddingMedication] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state variables for editing
  const [editingMedicationId, setEditingMedicationId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
    if (!medicationName || !medicationDosage || !medicationFrequency || !medicationStartDate || !medicationEndDate) {
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

  // New handler for edit button click
  const handleEditClick = (med: {
    id: number;
    medication_name: string;
    dosage: string;
    frequency: string;
    start_date: string | null;
    end_date: string | null;
  }) => {
    setEditingMedicationId(med.id);
    setMedicationName(med.medication_name);
    setMedicationDosage(med.dosage);
    setMedicationFrequency(med.frequency);
    setMedicationStartDate(med.start_date || "");
    setMedicationEndDate(med.end_date || "");
    setIsEditing(true);
    setError(null);
  };

  // New handler for canceling edit
  const handleCancelEdit = () => {
    setEditingMedicationId(null);
    setMedicationName("");
    setMedicationDosage("");
    setMedicationFrequency("");
    setMedicationStartDate("");
    setMedicationEndDate("");
    setIsEditing(false);
    setError(null);
  };

  // New handler for updating medication
  const handleUpdateMedication = async () => {
    if (!medicationName || !medicationDosage || !medicationFrequency || !medicationStartDate || !medicationEndDate) {
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

  // New handler for deleting medication
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
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, startOfDay(subDays(new Date(), 30)))}
                modifiers={{
                  taken: Array.from(takenDates).map(dateStr => new Date(dateStr)),
                  medication: medications.flatMap(med => {
                    if (!med.start_date || !med.end_date) return [];
                    const start = new Date(med.start_date);
                    const end = new Date(med.end_date);
                    const dates = [];
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                      dates.push(new Date(d));
                    }
                    return dates;
                  }),
                }}
                modifiersClassNames={{
                  taken: "bg-green-500 text-white rounded-full",
                  medication: "bg-blue-300 text-white rounded-full",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* <NotificationSettings patientId={patientId} /> */}
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
                        <div>End Date: {med.end_date}</div>
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
    </div>
  );
};

export default CaretakerDashboard;
