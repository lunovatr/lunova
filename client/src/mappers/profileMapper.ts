// profile.mapper.ts

import {
  ProfileResponse,
  EmergencyContact,
} from '../types/profile.types';

import {
  ProfileUpdatePayload,
  EmergencyContactPayload,
  UserUpdateData,
} from '../types/profile.payload';

/**
 * EmergencyContact (response) -> EmergencyContactPayload
 */
export const mapEmergencyContactToPayload = (
  contact: EmergencyContact
): EmergencyContactPayload => ({
  name: contact.name,
  phone_number: contact.phone_number,
  relationship: contact.relationship,
  is_primary: contact.is_primary,
});

/**
 * User (response) -> UserUpdateData
 */
export const mapUserToUpdatePayload = (
  user: ProfileResponse['user']
): UserUpdateData => ({
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  birth_date: user.birth_date,
  gender: user.gender,
  phone_number: user.phone_number,
  country: user.country,
  timezone: user.timezone,
});

/**
 * ProfileResponse -> ProfileUpdatePayload
 */
export const mapProfileToUpdatePayload = (
  profile: ProfileResponse
): ProfileUpdatePayload => ({
  support_goal: profile.support_goal,
  received_service_before: profile.received_service_before,
  onboarding_complete: profile.onboarding_complete,
  is_active_in_treatment: profile.is_active_in_treatment,

  substances_used: profile.substances_used?.map(s => s.id) ?? [],

  emergency_contacts: profile.emergency_contacts?.map(
    mapEmergencyContactToPayload
  ),

  user: mapUserToUpdatePayload(profile.user),
});
