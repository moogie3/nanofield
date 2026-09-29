import { getTranslations } from "next-intl/server"
import { Button, Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = async () => {
  const t = await getTranslations("cart")
  return (
    <div className="bg-card flex items-center justify-between">
      <div>
        <Heading level="h2" className="txt-xlarge">
          {t("signInTitle")}
        </Heading>
        <Text className="txt-medium text-ui-fg-subtle mt-2">
          {t("signInBody")}
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button
            variant="secondary"
            className="h-10"
            data-testid="sign-in-button"
          >
            {t("signIn")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
