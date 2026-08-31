// src/types/package.ts
//
// Backend: payments/serializers.py::PackageDefinitionSerializer/
// PackagePurchaseSerializer (Faz 2/7, Frontend Yapılandırması planı).

export interface PackageDefinition {
  id: number;
  name: string;
  session_count: number;
  applies_to_offering: number;
  applies_to_offering_name: string;
  discount_percentage: string | number;
  price: string | number | null;
  currency: string | null;
}

export interface PackagePurchase {
  id: number;
  package_definition: PackageDefinition;
  remaining_sessions: number;
  purchased_at: string;
}
