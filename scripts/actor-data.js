export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, NumberField, SchemaField, BooleanField } = foundry.data.fields;

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

      classLevel: new NumberField({ required: true, initial: 3, min: 0, integer: true }),

      conditions: new SchemaField({
        stressed: new BooleanField({ initial: false }),
        tired:    new BooleanField({ initial: false }),
        hurt:     new BooleanField({ initial: false }),
        hungry:   new BooleanField({ initial: false }),
        burdened: new BooleanField({ initial: false }),
        veteran:  new BooleanField({ initial: false }),
        marked:   new BooleanField({ initial: false }),
        wounded:  new StringField({ initial: "" }),
        down:     new BooleanField({ initial: false }),
        custom1:  new SchemaField({
          label: new StringField({ initial: "" }),
          text:  new StringField({ initial: "" }),
        }),
        custom2:  new SchemaField({
          label: new StringField({ initial: "" }),
          text:  new StringField({ initial: "" }),
        }),
        custom3:  new SchemaField({
          label: new StringField({ initial: "" }),
          text:  new StringField({ initial: "" }),
        }),
      }),

      companyName:  new StringField({ initial: "" }),
      companyDrive: new StringField({ initial: "" }),
      companyDie:   new StringField({ initial: "d6", choices: ["d4", "d6", "d8", "d10"] }),

      milestones: new foundry.data.fields.ArrayField(
        new foundry.data.fields.SchemaField({
          text:    new StringField({ initial: "" }),
          checked: new BooleanField({ initial: false }),
        }),
        { initial: [] }
      ),

      notes: new StringField({ initial: "" }),
    };
  }
}

export class HazardData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, NumberField, SchemaField, BooleanField } = foundry.data.fields;
    return {
      danger: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      hearts: new SchemaField({
        value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 6, min: 0, integer: true }),
      }),
      description: new StringField({ initial: "" }),
      notes:       new StringField({ initial: "" }),
      conditions: new SchemaField({
        stressed: new BooleanField({ initial: false }),
        tired:    new BooleanField({ initial: false }),
        hurt:     new BooleanField({ initial: false }),
        hungry:   new BooleanField({ initial: false }),
        burdened: new BooleanField({ initial: false }),
        veteran:  new BooleanField({ initial: false }),
        marked:   new BooleanField({ initial: false }),
        wounded:  new StringField({ initial: "" }),
        down:     new BooleanField({ initial: false }),
        custom1:  new SchemaField({
          label: new StringField({ initial: "" }),
          text:  new StringField({ initial: "" }),
        }),
        custom2:  new SchemaField({
          label: new StringField({ initial: "" }),
          text:  new StringField({ initial: "" }),
        }),
        custom3:  new SchemaField({
          label: new StringField({ initial: "" }),
          text:  new StringField({ initial: "" }),
        }),
      }),
    };
  }
}

export const actorDataModels = {
  character: CharacterData,
  hazard:    HazardData,
};