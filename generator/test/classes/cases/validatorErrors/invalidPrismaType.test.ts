import { it, expect } from 'vitest'

import { ExtendedDMMF } from '../../../../src/classes/extendedDMMF'
import { loadDMMF } from '../../../testUtils/loadDMMF'

it('should throw if the wrong key is used', async () => {
  const [dmmf, datamodel] = await loadDMMF(
    `${__dirname}/invalidPrismaType.prisma`
  )
  expect(() => new ExtendedDMMF(dmmf, {}, datamodel)).toThrowError(
    "[@zod generator error]: Validator 'number' is not valid for type 'String'. [Error Location]: Model: 'MyModel', Field: 'custom'."
  )
})
