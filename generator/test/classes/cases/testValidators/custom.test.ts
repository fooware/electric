import { describe, it, expect } from 'vitest'

import { ExtendedDMMF } from '../../../../src/classes/extendedDMMF'
import { loadDMMF } from '../../../testUtils/loadDMMF'

describe('test date validators', async () => {
  const [dmmf, datamodel] = await loadDMMF(`${__dirname}/custom.prisma`)
  const extendedDMMF = new ExtendedDMMF(dmmf, {}, datamodel)

  describe('test validators', () => {
    const fields = {
      id: extendedDMMF.datamodel.models[0].fields[0],
      custom: extendedDMMF.datamodel.models[0].fields[1],
    }

    it(`should add custom validator to field "${fields.custom.name}"`, () => {
      expect(fields.custom.zodCustomValidatorString).toBe(
        'z.string((value) => value.length > 5, { message: "Must be longer than 5 characters." })'
      )
    })
  })
})
