import { Flex, Text } from "rebass";
import { appVersion } from "../../utils/version";
import Field from "../field";
import Dialog from "./dialog";
import platform from "platform";
import { useState } from "react";
import { confirm, Perform } from "../../common/dialog-controller";
import { isUserPremium } from "../../hooks/use-is-user-premium";
import * as clipboard from "clipboard-polyfill/text";
import { store as userstore } from "../../stores/user-store";
import { db } from "../../common/db";

const PLACEHOLDERS = {
  title: "Briefly describe what happened",
  body: `Tell us more about the issue you are facing.

For example things like:
    1. Steps to reproduce the issue
    2. Things you have tried so far
    3. etc.
    
This is all optional, of course.`
};

type IssueDialogProps = {
  onClose: Perform;
};
function IssueDialog(props: IssueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Dialog
      isOpen={true}
      title={"Report an issue"}
      onClose={props.onClose}
      positiveButton={{
        text: "Submit",
        props: {
          form: "issueForm"
        },
        loading: isSubmitting,
        disabled: isSubmitting
      }}
      negativeButton={{ text: "Cancel", onClick: props.onClose }}
    >
      <Flex
        id="issueForm"
        as="form"
        flexDirection="column"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setIsSubmitting(true);
            setError(undefined);

            const formData = new FormData(e.target as HTMLFormElement);
            const requestData = Object.fromEntries(
              formData.entries() as IterableIterator<[string, string]>
            );

            if (!requestData.title.trim() || !requestData.body.trim()) return;
            requestData.body = BODY_TEMPLATE(requestData.body);
            const url = await db.debug?.report({
              title: requestData.title,
              body: requestData.body,
              userId: userstore.get().user?.id
            });
            if (!url) throw new Error("Could not submit bug report.");

            props.onClose(true);
            await showIssueReportedDialog({ url });
          } catch (e) {
            if (e instanceof Error) setError(e.message);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Field
          required
          label="Title"
          id="title"
          name="title"
          placeholder={PLACEHOLDERS.title}
          autoFocus
        />
        <Field
          as="textarea"
          required
          variant="forms.input"
          label="Description"
          id="body"
          name="body"
          placeholder={PLACEHOLDERS.body}
          sx={{ mt: 1 }}
          styles={{
            input: {
              minHeight: 150
            }
          }}
        />
        <Text
          variant="error"
          color="warn"
          bg={"warnBg"}
          mt={1}
          p={1}
          sx={{ borderRadius: "default" }}
        >
          Your bug report is public. Do NOT include sensitive information
          (email, passwords etc) in the issue title or description.
        </Text>
        <Text variant="subBody" mt={1}>
          {getDeviceInfo()
            .split("\n")
            .map((t) => (
              <>
                {t}
                <br />
              </>
            ))}
        </Text>
        {error && (
          <Text bg="errorBg" variant="error" mt={1} px={1}>
            Error: {error}
          </Text>
        )}
      </Flex>
    </Dialog>
  );
}

export default IssueDialog;

function showIssueReportedDialog({ url }: { url: string }) {
  return confirm({
    title: "Thank you for reporting!",
    yesAction: () => clipboard.writeText(url),
    yesText: "Copy link",
    message: (
      <>
        <p>
          You can track your bug report at{" "}
          <Text
            as="a"
            target="_blank"
            href={url}
            sx={{ lineBreak: "anywhere" }}
          >
            {url}
          </Text>
          .
        </p>
        <p>
          Please note that we will respond to your bug report on the link above.{" "}
          <b>
            We recommended that you save the above link for later reference.
          </b>
        </p>
        <p>
          If your issue is critical (e.g. notes not syncing, crashes etc.),
          please{" "}
          <a href="https://discord.com/invite/zQBK97EE22">
            join our Discord community
          </a>{" "}
          for one-to-one support.
        </p>
      </>
    )
  });
}

function getDeviceInfo() {
  const version = appVersion.formatted;
  const os = platform.os;
  const browser = `${platform.name} ${platform.version}`;

  return `App version: ${version}
OS: ${os}
Browser: ${browser}
Pro: ${isUserPremium()}`;
}

const BODY_TEMPLATE = (body: string) => {
  const info = `**Device information:**\n${getDeviceInfo()}`;
  if (!body) return info;
  return `${body}\n\n${info}`;
};