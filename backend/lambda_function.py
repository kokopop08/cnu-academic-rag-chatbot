import json
import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError

SERVICE_NAME = "충남대학교 학사·장학 안내 RAG 챗봇 테스트 API"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
}


def _build_response(status_code: int, body: dict) -> dict:
    """Build an API Gateway proxy response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def _count_s3_objects(s3_client, bucket_name: str) -> int:
    """Count uploaded document objects in the configured S3 bucket."""
    total_count = 0
    continuation_token = None

    while True:
        params = {"Bucket": bucket_name}
        if continuation_token:
            params["ContinuationToken"] = continuation_token

        response = s3_client.list_objects_v2(**params)
        contents = response.get("Contents")

        if contents is not None:
            total_count += sum(
                1
                for obj in contents
                if not (obj.get("Key", "").endswith("/") and obj.get("Size", 0) == 0)
            )
        else:
            total_count += response.get("KeyCount", 0)

        if not response.get("IsTruncated"):
            break
        continuation_token = response.get("NextContinuationToken")

    return total_count


def lambda_handler(event, context):
    """Handle /health requests and verify S3 bucket connectivity."""
    event = event or {}
    http_method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
        or ""
    ).upper()

    if http_method == "OPTIONS":
        return _build_response(200, {"status": "ok"})

    s3_client = boto3.client("s3")
    region = (
        os.environ.get("AWS_REGION")
        or os.environ.get("AWS_DEFAULT_REGION")
        or getattr(s3_client.meta, "region_name", None)
        or "ap-northeast-2"
    )
    bucket_name = os.environ.get("DOCS_BUCKET", "").strip()

    if not bucket_name:
        return _build_response(
            500,
            {
                "status": "error",
                "service": SERVICE_NAME,
                "region": region,
                "s3_bucket": "",
                "s3_status": "error",
                "uploaded_docs_count": 0,
                "error": "DOCS_BUCKET 환경변수가 설정되지 않았습니다.",
            },
        )

    try:
        uploaded_docs_count = _count_s3_objects(s3_client, bucket_name)
        return _build_response(
            200,
            {
                "status": "ok",
                "service": SERVICE_NAME,
                "region": region,
                "s3_bucket": bucket_name,
                "s3_status": "connected",
                "uploaded_docs_count": uploaded_docs_count,
            },
        )
    except (BotoCoreError, ClientError, Exception) as exc:
        print(f"Error connecting to S3 bucket '{bucket_name}': {exc}")
        return _build_response(
            500,
            {
                "status": "error",
                "service": SERVICE_NAME,
                "region": region,
                "s3_bucket": bucket_name,
                "s3_status": "error",
                "uploaded_docs_count": 0,
                "error": str(exc),
            },
        )
