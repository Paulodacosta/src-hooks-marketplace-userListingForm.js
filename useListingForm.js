import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabaseClient';
import { useToast } from "@/components/ui/use-toast";

const MAX_PHOTOS = 5;

export const useListingForm = (profile) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [type, setType] = useState('sale');
  const [tradePreferences, setTradePreferences] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handlePhotoChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).slice(0, MAX_PHOTOS - photos.length);
      if (newFiles.length === 0) {
        toast({ title: "Limite de photos atteinte", description: `Vous ne pouvez téléverser que ${MAX_PHOTOS} photos au maximum.`, variant: "warning" });
        return;
      }

      setUploadingPhotos(true);
      const newPhotoUrls = [];
      const newPhotoPreviewsArray = [...photoPreviews];

      for (const file of newFiles) {
        if (!profile || !profile.id) {
          toast({ title: "Erreur Utilisateur", description: "Impossible d'identifier l'utilisateur pour le téléversement.", variant: "destructive" });
          setUploadingPhotos(false);
          return;
        }
        const previewUrl = URL.createObjectURL(file);
        newPhotoPreviewsArray.push(previewUrl);
        
        const fileName = `${profile.id}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('marketplace-photos')
          .upload(fileName, file);

        if (error) {
          toast({ title: "Erreur de téléversement", description: `Erreur lors du téléversement de ${file.name}: ${error.message}`, variant: "destructive" });
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage.from('marketplace-photos').getPublicUrl(data.path);
        newPhotoUrls.push(publicUrl);
      }
      
      setPhotos(prev => [...prev, ...newPhotoUrls]);
      setPhotoPreviews(newPhotoPreviewsArray);
      setUploadingPhotos(false);
      if (e.target) e.target.value = null; 
    }
  };

  const removePhoto = (indexToRemove) => {
    setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    setPhotoPreviews(prev => {
      const newPreviews = prev.filter((_, index) => index !== indexToRemove);
      // URL.revokeObjectURL(prev[indexToRemove]); // Clean up object URL for the removed image
      return newPreviews;
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile || !profile.id) {
      toast({ title: "Erreur Utilisateur", description: "Vous devez être connecté pour créer une annonce.", variant: "destructive" });
      return;
    }
    if (photos.length === 0) {
      toast({ title: "Photos manquantes", description: "Veuillez ajouter au moins une photo pour votre annonce.", variant: "warning" });
      return;
    }
    if (type === 'sale' && (!price || parseFloat(price) <= 0)) {
        toast({ title: "Prix invalide", description: "Veuillez indiquer un prix valide pour la vente.", variant: "warning" });
        return;
    }
    if (!category) {
        toast({ title: "Catégorie manquante", description: "Veuillez sélectionner une catégorie.", variant: "warning" });
        return;
    }


    setIsSubmitting(true);
    try {
      const listingData = {
        user_id: profile.id,
        title,
        description,
        price: type === 'sale' ? parseFloat(price) : null,
        category,
        location,
        photos,
        type,
        trade_preferences: type === 'trade' ? tradePreferences : null,
        boosted: false,
        is_active: true,
      };

      const { error } = await supabase.from('marketplace_items').insert([listingData]);

      if (error) throw error;

      toast({
        title: "Annonce créée !",
        description: "Votre annonce a été publiée avec succès.",
        variant: "success",
      });
      navigate('/marketplace/mes-annonces');
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        title: "Erreur de création",
        description: error.message || "Une erreur est survenue lors de la création de l'annonce.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title, setTitle,
    description, setDescription,
    price, setPrice,
    category, setCategory,
    location, setLocation,
    photos,
    photoPreviews,
    type, setType,
    tradePreferences, setTradePreferences,
    isSubmitting,
    uploadingPhotos,
    handlePhotoChange,
    removePhoto,
    handleSubmit,
    MAX_PHOTOS
  };
};