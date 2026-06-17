import { LocationData } from "../types/location";

export type AddressFormFields = {
  phoneNumber: string;
  whatsappNotifications: boolean;
  street: string;
  apartmentBuilding: string;
  landmark: string;
  deliveryInstructions: string;
  shouldCallForInstructions: boolean;
};

export function locationToAddressFormFields(location: LocationData): AddressFormFields {
  return {
    phoneNumber: location.phoneNumber ?? "",
    whatsappNotifications: location.whatsappNotifications ?? true,
    street: location.street ?? "",
    apartmentBuilding: location.apartmentBuilding ?? "",
    landmark: location.landmark ?? "",
    deliveryInstructions: location.deliveryInstructions ?? "",
    shouldCallForInstructions: location.shouldCallForInstructions ?? false,
  };
}

export function coreLocationFromData(location: LocationData): LocationData {
  return {
    address: location.address,
    lat: location.lat,
    lng: location.lng,
    placeId: location.placeId,
    placeName: location.placeName,
    city: location.city,
    state: location.state,
    country: location.country,
  };
}
