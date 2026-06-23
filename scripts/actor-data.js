export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, NumberField, SchemaField } = foundry.data.fields;

    return {
      concept: new StringField({ initial: "" }),

      hearts: new SchemaField({
        value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 6, min: 0, integer: true }),
      }),
      stars: new SchemaField({
        value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 6, min: 0, integer: true }),
      }),

      gears:     new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      lore:      new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      wealth:    new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      lifestyle: new StringField({ initial: "" }),

      conditions: new StringField({ initial: "" }),
      notes:      new StringField({ initial: "" }),
    };
  }
}

export class HazardData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, NumberField, SchemaField } = foundry.data.fields;
    return {
      hearts: new SchemaField({
        value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 6, min: 0, integer: true }),
      }),
      description: new StringField({ initial: "" }),
    };
  }
}

export const actorDataModels = {
  character: CharacterData,
  hazard:    HazardData,
};
