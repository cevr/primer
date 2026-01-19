import { Data } from "effect"

export class ContentNotFoundError extends Data.TaggedError("ContentNotFoundError")<{
  readonly path: string
}> {
  override get message() {
    return `Primer not found: ${this.path}`
  }
}

export class FetchError extends Data.TaggedError("FetchError")<{
  readonly url: string
  readonly cause?: unknown
}> {
  override get message() {
    return `Failed to fetch: ${this.url}`
  }
}

export class ManifestError extends Data.TaggedError("ManifestError")<{
  readonly cause?: unknown
}> {
  override get message() {
    return "Failed to load manifest"
  }
}
