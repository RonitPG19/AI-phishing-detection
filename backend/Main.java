import jakarta.mail.*;
import jakarta.mail.internet.MimeMultipart;

import java.util.*;
import java.util.regex.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;


public class Main {

    public static void main(String[] args) {
        String host = "imap.gmail.com";
        String username = System.getenv("email_address");
        String password = System.getenv("email_password");

        Properties props = new Properties();
        props.put("mail.store.protocol", "imaps");
        props.put("mail.imaps.ssl.enable", "true");
        props.put("mail.imaps.port", "993");

        try {
            Session session = Session.getInstance(props);
            Store store = session.getStore("imaps");

            System.out.println("Connecting...");
            store.connect(host, username, password);
            System.out.println("Connected Successfully!");

            Folder inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_ONLY);

            int total = inbox.getMessageCount();
            if (total == 0) {
                System.out.println("Inbox empty.");
                return;
            }

            // ---- PROCESS ONLY ONE EMAIL ----
            Message msg = inbox.getMessage(total);

            String body = getMessageBody(msg);

            // -----------------------
            // EXTRACT DOMAINS (UNIQUE)
            // -----------------------
            Set<String> openPhish = loadOpenPhishFeed();
            Set<String> urls = extractUniqueUrls(body);

            for (String url : urls) {
                System.out.println("Checking URL: " + url);

                if (openPhish.contains(url)) {
                    System.out.println("🔥 PHISHING URL FOUND in OpenPhish!");
                } else {
                    System.out.println("✔ Not in OpenPhish feed (safe or unknown)");
                }

                System.out.println();
            }

            inbox.close(false);
            store.close();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ===========================================================
    // Extract Only Domains (unique)
    // ===========================================================
    private static Set<String> extractUniqueUrls(String text) {
        Set<String> urls = new HashSet<>();

        String regex = "(https?://[^\\s\"'<>()]+)";
        Matcher matcher = Pattern.compile(regex).matcher(text);

        while (matcher.find()) {
            urls.add(matcher.group());
        }

        return urls;
    }

    // ===========================================================
    // EMAIL BODY HELPERS
    // ===========================================================
    private static String getMessageBody(Part part) throws Exception {
        if (part.isMimeType("text/plain")) {
            return (String) part.getContent();
        }
        else if (part.isMimeType("text/html")) {
            return (String) part.getContent();
        }
        else if (part.isMimeType("multipart/*")) {
            MimeMultipart multipart = (MimeMultipart) part.getContent();
            return getTextFromMimeMultipart(multipart);
        }
        return "";
    }

    private static String getTextFromMimeMultipart(MimeMultipart multipart) throws Exception {
        StringBuilder result = new StringBuilder();

        for (int i = 0; i < multipart.getCount(); i++) {
            BodyPart bodyPart = multipart.getBodyPart(i);

            if (bodyPart.isMimeType("text/plain")) {
                result.append(bodyPart.getContent());
            }
            else if (bodyPart.isMimeType("text/html")) {
                result.append(bodyPart.getContent());
            }
            else if (bodyPart.getContent() instanceof MimeMultipart) {
                result.append(getTextFromMimeMultipart((MimeMultipart) bodyPart.getContent()));
            }
        }

        return result.toString();
    }
    private static String checkPhishTank(String fullUrl, String appKey) {
        try {
            String encodedUrl = Base64.getEncoder().encodeToString(fullUrl.getBytes());

            StringBuilder postData = new StringBuilder();
            postData.append("url=").append(encodedUrl);
            postData.append("&format=json");

            if (appKey != null && !appKey.isEmpty()) {
                postData.append("&app_key=").append(appKey);
            }

            byte[] postBytes = postData.toString().getBytes("UTF-8");

            URL url = new URL("https://checkurl.phishtank.com/checkurl/");  // <-- FIXED (HTTPS)
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            conn.getOutputStream().write(postBytes);

            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String line;
            StringBuilder response = new StringBuilder();

            while ((line = in.readLine()) != null) {
                response.append(line).append("\n");
            }

            in.close();
            return response.toString();

        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }
    private static Set<String> loadOpenPhishFeed() {
        Set<String> phishSet = new HashSet<>();
        try {
            URL url = new URL("https://openphish.com/feed.txt");
            BufferedReader in = new BufferedReader(new InputStreamReader(url.openStream()));

            String line;
            while ((line = in.readLine()) != null) {
                phishSet.add(line.trim());
            }
            in.close();

        } catch (Exception e) {
            System.out.println("Error loading OpenPhish feed: " + e.getMessage());
        }

        return phishSet;
    }
}
