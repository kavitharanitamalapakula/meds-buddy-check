import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Image, Camera, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface MedicationTrackerProps {
  date: string;
  isTaken: boolean;
  onMarkTaken: (date: string, imageFile?: File) => void;
  isToday: boolean;
  patientId?: string;
}

const MedicationTracker = ({
  date,
  isTaken,
  onMarkTaken,
  isToday,
}: MedicationTrackerProps) => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const patientDetails = JSON.parse(localStorage.getItem("patientDetails") || "{}");
  const [patientMedications, setPatientMedications] = useState<
    {
      id: number;
      medication_name: string;
      dosage: string;
      frequency: string;
      start_date: string | null;
      end_date: string | null;
      image_url?: string | null;
    }[]
  >([]);

  const fetchMedications = async () => {
    const { data, error } = await supabase.from("medications").select("*");

    if (error) {
      console.error("Error fetching medications:", error);
      return;
    }

    const filtered = data.filter((med) => med.patient_id === patientDetails.id);
    setPatientMedications(filtered);
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const dailyMedication = {
    name: "Daily Medication Set",
    time: "8:00 AM",
    description: "Complete set of daily tablets",
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(file);
      setImagePreview(imageUrl);
    }
  };

  const handleMarkTaken = async () => {
    if (!isToday) return;

    if (!user) {
      toast({
        title: "You must be logged in to upload images.",
      });
      return;
    }

    try {
      let imageUrl: string | null = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `medication-images/${fileName}`;
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('medication-images')
          .upload(filePath, selectedImage);

        if (uploadError) {
          console.error('Error uploading image:', uploadError.message);
          toast({
            title: "Failed to upload image. Please try again.",
          });
          return;
        }

        // Get public URL
        const { data } = supabase.storage
          .from('medication-images')
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
        console.log('Image URL:', imageUrl);
      }
      onMarkTaken(date, selectedImage || undefined);
      setSelectedImage(null);
      setImagePreview(null);
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
  if (isTaken) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 bg-green-50 rounded-xl border-2 border-green-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              Medication Completed!
            </h3>
            <p className="text-green-600">
              Great job! You've taken your medication for {format(new Date(date), "MMMM d, yyyy")}.
            </p>
          </div>
        </div>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-green-800">{dailyMedication.name}</h4>
                <p className="text-sm text-green-600">{dailyMedication.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="font-medium">{dailyMedication.name}</h4>
              <p className="text-sm text-muted-foreground">{dailyMedication.description}</p>

              {patientMedications.length === 0 ? (
                <div className="text-center text-muted-foreground">No medications found.</div>
              ) : (
                patientMedications.map((med, index) => (
                  <Card key={med.id} className="hover:shadow-md transition-shadow mt-3">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{med.medication_name}</h4>
                        </div>
                      </div>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(date), "h:mm a")}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Upload Section */}
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="p-6">
          <div className="text-center">
            <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Add Proof Photo (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Take a photo of your medication or pill organizer as confirmation
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mb-4"
            >
              <Camera className="w-4 h-4 mr-2" />
              {selectedImage ? "Change Photo" : "Take Photo"}
            </Button>

            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Medication proof"
                  className="max-w-full h-32 object-cover rounded-lg mx-auto border-2 border-border"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Photo selected: {selectedImage?.name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mark as Taken Button */}
      <Button
        onClick={handleMarkTaken}
        className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 text-white"
        disabled={!isToday}
      >
        <Check className="w-5 h-5 mr-2" />
        {isToday ? "Mark as Taken" : "Cannot mark future dates"}
      </Button>

      {!isToday && (
        <p className="text-center text-sm text-muted-foreground">
          You can only mark today's medication as taken
        </p>
      )}
    </div>
  );
};

export default MedicationTracker;
