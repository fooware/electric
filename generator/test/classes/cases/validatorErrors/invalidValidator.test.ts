import { it, expect } from 'vitest'

import { ExtendedDMMF } from '../../../../src/classes/extendedDMMF'
import { loadDMMF } from '../../../testUtils/loadDMMF'

it("should throw if the wrong validator is used for a type that doesn't support it", async () => {
  const [dmmf, datamodel] = await loadDMMF(
    `${__dirname}/invalidValidator.prisma`
  )
  expect(() => new ExtendedDMMF(dmmf, {}, datamodel)).toThrowError(
    "[@zod generator error]: Validator 'lt' is not valid for type 'String', for specified '@zod.[key] or for 'z.array.[key]'. [Error Location]: Model: 'MyModel', Field: 'custom'."
  )
})
