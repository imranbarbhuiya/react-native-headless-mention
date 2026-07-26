# Changelog
All notable changes to this project will be documented in this file.

# [2.0.0](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.2.6...v2.0.0) - (2026-07-26)

## 🐛 Bug Fixes

- Apply allowedSpacesCount and document the props ([dc00022](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/dc00022efaceb6b156e28b18c31973cf90ba1ab7))

## 🚀 Features

- Hand suggestions to the consumer instead of rendering them ([4493a63](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/4493a63c729b5993fa62c921c21d4b3ac794bd0e))
  - 💥 **BREAKING CHANGE:** partTypes[].renderSuggestions and partTypes[].renderPosition
are removed; use suggestions[trigger] from useMention. Input no longer takes
value, onChange and partTypes: pass them to useMention and spread inputProps.
containerStyle is removed along with the wrapper View that held the
suggestions.

* perf: skip the character diff for single-run edits, which is what a
keystroke, a backspace or a paste produces. Only replacements still need
diffChars. A keystroke on a 4.5k char value goes from 0.096ms to 0.013ms
and no longer grows with the length of the value.
* fix: getPartsInterval sliced a part with an absolute document position as
the end offset, so a kept run that started inside a part and ended before
its end returned too much text and corrupted the value.
* fix: onSuggestionPress is a no-op while its keyword is undefined, instead
of wiping the text it had no trigger to replace.
* perf: memoize inputProps and suggestions, and bail out of selection updates
that do not move the cursor.
* test: move from vitest to jest + @testing-library/react-native, since
react-test-renderer is deprecated. Adds coverage for Input and for the
full flow, which the previous setup could not render.
* build: migrate tsup to tsdown, pin platform to neutral to keep the emitted
file names, and declare types per export condition.
* chore: base the tsconfig on @react-native/typescript-config.

# Changelog
All notable changes to this project will be documented in this file.

# [1.2.4](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.2.3...v1.2.4) - (2024-12-13)

## 🐛 Bug Fixes

- Fix in new diff version ([0d90f97](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/0d90f97481a2565345c9cbd04253b2d7aeb19cca))
- Use older diff version ([911b809](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/911b809a1d9dc2c388a29de2fcf805593fb816d4))

# [1.2.3](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.2.2...v1.2.3) - (2024-12-13)

## 🐛 Bug Fixes

- Should handle cursor position properly for emoji input ([fe94ba9](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/fe94ba93b99f68e69fa876b39701752f0559e257))

## 🧪 Testing

- Add tests ([bebc8a2](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/bebc8a2a95f93a5a82410f51f841b15cd4b8a42c))

# [1.2.1](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.2.0...v1.2.1) - (2024-10-24)

## 🐛 Bug Fixes

- **deps:** Update dependency diff to v7 (#81) ([94d2a9d](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/94d2a9d1c0bcece7ee30c5d9674811687c27386d))
- Add a video ([1c7198c](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/1c7198c6499a06529903502ae960a5f313110540))

# [1.2.0](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.1.2...v1.2.0) - (2024-04-02)

## 🐛 Bug Fixes

- Editing text removes texts after the cursor ([db20e30](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/db20e3068b15a2755253a6be3ef55fe315b57bfb))

## 🚀 Features

- Allow custom text input component ([06736aa](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/06736aaa698c9f9a76e45e15fad8d09f819e00bb))

# [1.1.2](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.1.2...v1.1.2) - (2024-02-09)

## 🐛 Bug Fixes

- Remove name prop ([1d8cea2](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/1d8cea29dd71327ae08c1f63dab00d64ce4b828f))
- Pass new parts ([14d65aa](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/14d65aa68e8c0fe3e42bca9b3c110269552592c0))

# [1.1.1](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.1.1...v1.1.1) - (2024-02-09)

## 📝 Documentation

- Update example ([1579998](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/15799982c007c3314cc7b29045568bd1482fb5dd))

# [1.1.0](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v1.1.0...v1.1.0) - (2024-02-09)

## 🚀 Features

- Pass parts to onChange ([c5479be](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/c5479beae21148e474c3eba7475d56286f709e6e))
- Allow name prop in parts ([1281ceb](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/1281cebd78320cc912097b575751518c60252ac7))

# [0.0.1](https://github.com/imranbarbhuiya/react-native-headless-mention/compare/v0.0.1...v0.0.1) - (2024-02-07)

## 🐛 Bug Fixes

- Use new regex ([99c6dae](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/99c6dae9010be204ad4a739bceb8f3b50fc8a367))
- Hello github ([8cab4aa](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/8cab4aa6a6e349f643d00bcc337a6a2bc17d6b49))
- Style ([117f685](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/117f685635984f2fd216bc10ab68cb895e287945))
- Place style properly ([d7364a2](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/d7364a23364a9f326dbcdee208a8da29e2e7aa6f))

## 🚀 Features

- Initial commit ([bda0faf](https://github.com/imranbarbhuiya/react-native-headless-mention/commit/bda0fafe501385750c2bd57807b41a6fac14f4c5))

