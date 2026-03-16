export interface CategoricalAttributeMetadata {
  name: string;
  type: "categorical";
  values: string[];
}

export interface NumericalAttributeMetadata {
  name: string;
  type: "numerical";
  min: number;
  max: number;
}

export type AttributeMetadata = CategoricalAttributeMetadata | NumericalAttributeMetadata;

export interface Metadata {
  eventAttributes: AttributeMetadata[];
  recordAttributes: AttributeMetadata[];
}
